const Registration = require('../models/registrationmodel');
const Event = require('../models/eventmodels');
const Attendance = require('../models/attendancemodel');
const User = require('../models/usermodel');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendMail } = require('../middleware/auth');

// Helper: generate QR code data URI
async function generateQR(data) {
  return QRCode.toDataURL(JSON.stringify(data), { width: 300 });
}

// =====================
// REGISTER FOR EVENT (Normal: instant confirm; Merchandise: pending payment)
// =====================
const registerForEvent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { eventId, formResponses, merchandiseSelection } = req.body;
        const userId = req.user._id;

        const event = await Event.findById(eventId).session(session);
        if (!event) throw new Error('Event not found');
        if (event.Action === 'draft') throw new Error('Registration is not open for this event');
        if (new Date() > new Date(event.Registration_deadline)) throw new Error('Registration deadline has passed');

        const existingRegistration = await Registration.findOne({
            Event_id: eventId, User_id: userId
        }).session(session);
        if (existingRegistration) throw new Error('User already registered for this event');

        const ticketId = uuidv4();

        if (event.Event_type === 'normal') {
            // Check registration limit
            const count = await Registration.countDocuments({ Event_id: eventId }).session(session);
            if (count >= event.Registrationlimit) throw new Error('Registration limit reached');

            const qrData = { ticketId, eventId: event._id.toString(), eventName: event.name, userId };
            const qrCode = await generateQR(qrData);

            const reg = new Registration({
                Event_id: eventId,
                User_id: userId,
                ticketId,
                qrCode,
                formResponses: formResponses || [],
                status: 'confirmed',
                paymentStatus: 'not_applicable'
            });
            await reg.save({ session });
            await session.commitTransaction();
            session.endSession();

            // Send ticket email
            const user = await User.findById(userId).select('email first_name');
            if (user) {
                await sendMail({
                    to: user.email,
                    subject: `[Felicity] Ticket - ${event.name}`,
                    text: `Hi ${user.first_name},\n\nYour registration for "${event.name}" is confirmed!\n\nTicket ID: ${ticketId}\n\nShow your QR code at the event for attendance.\n\nCheers,\nFelicity Team`
                });
            }

            return res.status(201).json({ message: 'Registration successful', registration: reg, ticketId, qrCode });
        }

        // MERCHANDISE: pending payment workflow
        if (event.Event_type === 'merchandise') {
            if (!merchandiseSelection || !merchandiseSelection.size || !merchandiseSelection.color) {
                throw new Error('Please select a merchandise variant (size and color)');
            }

            // Validate variant exists and has stock (don't decrement yet — wait for approval)
            const variant = event.merchandiseDetails?.variants?.find(v =>
                v.size === merchandiseSelection.size && v.color === merchandiseSelection.color
            );
            if (!variant) throw new Error(`Variant ${merchandiseSelection.size} / ${merchandiseSelection.color} not found`);
            if (variant.stock < 1) throw new Error(`Variant ${merchandiseSelection.size} / ${merchandiseSelection.color} is out of stock`);

            const reg = new Registration({
                Event_id: eventId,
                User_id: userId,
                ticketId,
                qrCode: '', // No QR until payment approved
                merchandiseSelection: {
                    size: merchandiseSelection.size,
                    color: merchandiseSelection.color,
                    quantity: 1
                },
                status: 'pending_payment',
                paymentStatus: 'pending',
                formResponses: formResponses || []
            });
            await reg.save({ session });
            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                message: 'Order placed! Please upload payment proof.',
                registration: reg,
                ticketId,
                requiresPaymentProof: true
            });
        }

        throw new Error('Unknown event type');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: error.message });
    }
};

// =====================
// UPLOAD PAYMENT PROOF (student)
// =====================
const uploadPaymentProof = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const userId = req.user._id;

        if (!req.file) return res.status(400).json({ error: 'Payment proof image is required' });

        const reg = await Registration.findOne({ _id: registrationId, User_id: userId });
        if (!reg) return res.status(404).json({ error: 'Registration not found' });
        if (reg.paymentStatus !== 'pending') {
            return res.status(400).json({ error: 'Payment proof can only be uploaded for pending orders' });
        }

        reg.paymentProof = '/uploads/' + req.file.filename;
        await reg.save();

        res.status(200).json({ message: 'Payment proof uploaded', paymentProof: reg.paymentProof });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =====================
// ORGANIZER: List merchandise orders for their events
// =====================
const getMerchOrders = async (req, res) => {
    try {
        const organizerId = req.user._id;
        const { eventId, status } = req.query;

        // Find events owned by this organizer
        const filter = { Club_id: organizerId, Event_type: 'merchandise' };
        if (eventId) filter._id = eventId;
        const events = await Event.find(filter).select('_id');
        const eventIds = events.map(e => e._id);

        const regFilter = { Event_id: { $in: eventIds } };
        if (status && status !== 'all') regFilter.paymentStatus = status;

        const orders = await Registration.find(regFilter)
            .populate('Event_id', 'name Registration_fee')
            .populate('User_id', 'first_name last_name email')
            .sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =====================
// ORGANIZER: Approve payment
// =====================
const approvePayment = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const organizerId = req.user._id;
        const { comment } = req.body;

        const reg = await Registration.findById(registrationId).populate('Event_id');
        if (!reg) return res.status(404).json({ error: 'Registration not found' });

        // Verify organizer owns this event
        if (reg.Event_id.Club_id.toString() !== organizerId.toString()) {
            return res.status(403).json({ error: 'Not your event' });
        }
        if (reg.paymentStatus !== 'pending') {
            return res.status(400).json({ error: 'Order is not in pending state' });
        }

        // Check stock and decrement
        const event = await Event.findById(reg.Event_id._id);
        const variant = event.merchandiseDetails?.variants?.find(v =>
            v.size === reg.merchandiseSelection.size && v.color === reg.merchandiseSelection.color
        );
        if (!variant || variant.stock < 1) {
            return res.status(400).json({ error: 'Variant out of stock, cannot approve' });
        }
        variant.stock -= 1;
        await event.save();

        // Generate QR and ticket
        const qrData = { ticketId: reg.ticketId, eventId: event._id.toString(), eventName: event.name, userId: reg.User_id.toString() };
        const qrCode = await generateQR(qrData);

        reg.paymentStatus = 'approved';
        reg.status = 'confirmed';
        reg.qrCode = qrCode;
        reg.paymentReviewedBy = organizerId;
        reg.paymentReviewedAt = new Date();
        reg.paymentComment = comment || '';
        await reg.save();

        // Send confirmation email
        const user = await User.findById(reg.User_id).select('email first_name');
        if (user) {
            await sendMail({
                to: user.email,
                subject: `[Felicity] Payment Approved - ${event.name}`,
                text: `Hi ${user.first_name},\n\nYour payment for "${event.name}" has been approved!\n\nTicket ID: ${reg.ticketId}\nVariant: ${reg.merchandiseSelection.size} / ${reg.merchandiseSelection.color}\n\nShow your QR code for pickup.\n\nCheers,\nFelicity Team`
            });
        }

        res.status(200).json({ message: 'Payment approved, ticket generated', registration: reg });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =====================
// ORGANIZER: Reject payment
// =====================
const rejectPayment = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const organizerId = req.user._id;
        const { comment } = req.body;

        const reg = await Registration.findById(registrationId).populate('Event_id');
        if (!reg) return res.status(404).json({ error: 'Registration not found' });
        if (reg.Event_id.Club_id.toString() !== organizerId.toString()) {
            return res.status(403).json({ error: 'Not your event' });
        }
        if (reg.paymentStatus !== 'pending') {
            return res.status(400).json({ error: 'Order is not in pending state' });
        }

        reg.paymentStatus = 'rejected';
        reg.status = 'rejected';
        reg.paymentReviewedBy = organizerId;
        reg.paymentReviewedAt = new Date();
        reg.paymentComment = comment || 'Payment rejected';
        await reg.save();

        // Notify user
        const user = await User.findById(reg.User_id).select('email first_name');
        if (user) {
            await sendMail({
                to: user.email,
                subject: `[Felicity] Payment Rejected - ${reg.Event_id.name}`,
                text: `Hi ${user.first_name},\n\nYour payment for "${reg.Event_id.name}" has been rejected.\nReason: ${comment || 'Not specified'}\n\nPlease contact the organizer for details.`
            });
        }

        res.status(200).json({ message: 'Payment rejected', registration: reg });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =====================
// QR SCAN / MARK ATTENDANCE
// =====================
const markAttendance = async (req, res) => {
    try {
        const { ticketId, eventId } = req.body;
        const scannedBy = req.user._id;

        if (!ticketId || !eventId) return res.status(400).json({ error: 'ticketId and eventId required' });

        // Verify event belongs to this organizer
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.Club_id.toString() !== scannedBy.toString()) {
            return res.status(403).json({ error: 'Not your event' });
        }

        const reg = await Registration.findOne({ ticketId, Event_id: eventId });
        if (!reg) return res.status(404).json({ error: 'Invalid ticket — no registration found' });
        if (reg.status !== 'confirmed') return res.status(400).json({ error: 'Registration not confirmed (status: ' + reg.status + ')' });

        // Check for duplicate scan
        const existing = await Attendance.findOne({ Event_id: eventId, User_id: reg.User_id });
        if (existing) {
            return res.status(409).json({
                error: 'Duplicate scan — attendance already recorded',
                scannedAt: existing.scannedAt
            });
        }

        const attendance = await Attendance.create({
            Event_id: eventId,
            Registration_id: reg._id,
            User_id: reg.User_id,
            ticketId,
            scannedBy,
            method: 'qr_scan'
        });

        // Update event attendance count
        await Event.findByIdAndUpdate(eventId, { $inc: { Attendance: 1 } });

        const user = await User.findById(reg.User_id).select('first_name last_name email');

        res.status(200).json({
            message: 'Attendance marked',
            attendance,
            participant: user ? { name: user.first_name + ' ' + (user.last_name || ''), email: user.email } : null
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Duplicate scan — attendance already recorded' });
        }
        res.status(500).json({ error: error.message });
    }
};

// =====================
// MANUAL OVERRIDE ATTENDANCE
// =====================
const manualAttendance = async (req, res) => {
    try {
        const { userId, eventId, reason } = req.body;
        const scannedBy = req.user._id;

        if (!userId || !eventId) return res.status(400).json({ error: 'userId and eventId required' });
        if (!reason) return res.status(400).json({ error: 'Reason is required for manual override' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.Club_id.toString() !== scannedBy.toString()) {
            return res.status(403).json({ error: 'Not your event' });
        }

        const reg = await Registration.findOne({ User_id: userId, Event_id: eventId });
        if (!reg) return res.status(404).json({ error: 'No registration found for this user and event' });

        // Check for duplicate
        const existing = await Attendance.findOne({ Event_id: eventId, User_id: userId });
        if (existing) {
            return res.status(409).json({ error: 'Attendance already recorded', scannedAt: existing.scannedAt });
        }

        const attendance = await Attendance.create({
            Event_id: eventId,
            Registration_id: reg._id,
            User_id: userId,
            ticketId: reg.ticketId || 'MANUAL-' + Date.now(),
            scannedBy,
            method: 'manual_override',
            overrideReason: reason
        });

        await Event.findByIdAndUpdate(eventId, { $inc: { Attendance: 1 } });

        res.status(200).json({ message: 'Manual attendance recorded', attendance });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Attendance already recorded' });
        }
        res.status(500).json({ error: error.message });
    }
};

// =====================
// GET ATTENDANCE DASHBOARD
// =====================
const getAttendanceDashboard = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.Club_id.toString() !== organizerId.toString()) {
            return res.status(403).json({ error: 'Not your event' });
        }

        // All registrations for this event
        const registrations = await Registration.find({ Event_id: eventId, status: 'confirmed' })
            .populate('User_id', 'first_name last_name email');

        // All attendance records
        const attended = await Attendance.find({ Event_id: eventId })
            .populate('User_id', 'first_name last_name email')
            .populate('scannedBy', 'first_name organizer_name');

        const attendedUserIds = new Set(attended.map(a => a.User_id?._id?.toString()));

        const scanned = registrations.filter(r => attendedUserIds.has(r.User_id?._id?.toString()));
        const notScanned = registrations.filter(r => !attendedUserIds.has(r.User_id?._id?.toString()));

        res.status(200).json({
            eventName: event.name,
            totalRegistered: registrations.length,
            totalScanned: attended.length,
            totalNotScanned: notScanned.length,
            scanned: attended.map(a => ({
                _id: a._id,
                name: a.User_id ? a.User_id.first_name + ' ' + (a.User_id.last_name || '') : 'Unknown',
                email: a.User_id?.email,
                ticketId: a.ticketId,
                scannedAt: a.scannedAt,
                method: a.method,
                overrideReason: a.overrideReason,
                scannedBy: a.scannedBy?.organizer_name || a.scannedBy?.first_name || 'N/A'
            })),
            notScanned: notScanned.map(r => ({
                userId: r.User_id?._id,
                name: r.User_id ? r.User_id.first_name + ' ' + (r.User_id.last_name || '') : 'Unknown',
                email: r.User_id?.email,
                ticketId: r.ticketId,
                registeredAt: r.Registration_date
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =====================
// EXPORT ATTENDANCE CSV
// =====================
const exportAttendanceCSV = async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerId = req.user._id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.Club_id.toString() !== organizerId.toString()) {
            return res.status(403).json({ error: 'Not your event' });
        }

        const registrations = await Registration.find({ Event_id: eventId, status: 'confirmed' })
            .populate('User_id', 'first_name last_name email contact_number');

        const attended = await Attendance.find({ Event_id: eventId });
        const attendedMap = {};
        attended.forEach(a => { attendedMap[a.User_id.toString()] = a; });

        let csv = 'Name,Email,Contact,TicketID,Registered At,Attended,Scanned At,Method,Override Reason\n';
        registrations.forEach(r => {
            const u = r.User_id;
            const a = attendedMap[u?._id?.toString()];
            csv += `"${u?.first_name || ''} ${u?.last_name || ''}","${u?.email || ''}","${u?.contact_number || ''}","${r.ticketId || ''}","${r.Registration_date?.toISOString() || ''}","${a ? 'Yes' : 'No'}","${a?.scannedAt?.toISOString() || ''}","${a?.method || ''}","${a?.overrideReason || ''}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_${eventId}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =====================
// GET EVENT REGISTRATIONS (organizer view — with participant list for event detail page)
// =====================
const getEventRegistrations = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { search, paymentStatus } = req.query;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const filter = { Event_id: eventId };
        if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;

        let registrations = await Registration.find(filter)
            .populate('User_id', 'first_name last_name email contact_number')
            .sort({ Registration_date: -1 });

        if (search) {
            const re = new RegExp(search, 'i');
            registrations = registrations.filter(r =>
                re.test(r.User_id?.first_name) || re.test(r.User_id?.last_name) || re.test(r.User_id?.email) || re.test(r.ticketId)
            );
        }

        res.status(200).json(registrations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get user registrations
const getUserRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ User_id: req.user._id })
            .populate('Event_id')
            .sort({ Registration_date: -1 });
        res.status(200).json(registrations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cancel registration
const cancelRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const userId = req.user._id;

        const reg = await Registration.findOne({ _id: registrationId, User_id: userId });
        if (!reg) return res.status(404).json({ error: 'Registration not found' });

        // If merchandise was approved, restore stock
        if (reg.paymentStatus === 'approved' && reg.merchandiseSelection) {
            const event = await Event.findById(reg.Event_id);
            if (event) {
                const variant = event.merchandiseDetails?.variants?.find(v =>
                    v.size === reg.merchandiseSelection.size && v.color === reg.merchandiseSelection.color
                );
                if (variant) { variant.stock += 1; await event.save(); }
            }
        }

        reg.status = 'cancelled';
        await reg.save();
        res.status(200).json({ message: 'Registration cancelled' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get user's registration for a specific event
const getMyEventRegistration = async (req, res) => {
    try {
        const { eventId } = req.params;
        const reg = await Registration.findOne({
            Event_id: eventId,
            User_id: req.user._id
        });
        if (!reg) return res.status(200).json({ registration: null });
        res.status(200).json({ registration: reg });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registerForEvent,
    getUserRegistrations,
    cancelRegistration,
    uploadPaymentProof,
    getMerchOrders,
    approvePayment,
    rejectPayment,
    markAttendance,
    manualAttendance,
    getAttendanceDashboard,
    exportAttendanceCSV,
    getEventRegistrations,
    getMyEventRegistration
};