const { requireAuth,
  requireRole,
  createToken,
  bcrypt,
  otps,
  sendMail,
  sendLoginNotification,
  sendOtp,
  verifyOtp } = require('../middleware/auth.js');
const Event = require('../models/eventmodels');
const Registration = require('../models/registrationmodel');
const Feedback = require('../models/feedbackmodel');
const Attendance = require('../models/attendancemodel');
const mongoose = require('mongoose');

// Create a new event
const createEvent = async (req, res) => {
  try {
    const {
      name,
      Registration_deadline,
      Registration_fee,
      Description,
      Event_start,
      Event_end,
      Event_type,
      Event_tags,
      Eligibility_criteria,
      Registrationlimit,
      Action,
      customForm,
      merchandiseDetails
    } = req.body;

    // Validation for Event_end > Event_start is handled in model, but good to check here too
    if (new Date(Event_end) <= new Date(Event_start)) {
      return res.status(400).json({ error: 'Event end date must be after start date' });
    }

    const newEvent = new Event({
      name,
      Registration_deadline,
      Registration_fee,
      Description,
      Event_start,
      Event_end,
      Event_type,
      Event_tags,
      Eligibility_criteria,
      Registrationlimit,
      Action,
      Club_id: req.user._id, // Assuming req.user is populated by requireAuth middleware
      customForm: Event_type === 'normal' ? customForm : undefined,
      merchandiseDetails: Event_type === 'merchandise' ? merchandiseDetails : undefined
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all events with filters and fuzzy search
const getEvents = async (req, res) => {
  try {
    const { search, type, eligibility, startDate, endDate, followedClubs } = req.query;

    let query = { Action: { $ne: 'draft' } }; // Only show non-draft events to public

    // Fuzzy search by name or organizer's name (requires population or aggregation if searching by organizer name string)
    // For now, let's search by Event name. To search by organizer name, we'd need to look up users first or use aggregation.
    // The requirement says "Partial & Fuzzy matching on Event/Organizer names".
    // Let's implement search on Event Name first.
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }
        // We will handle organizer name search separately or via aggregation if strictly needed, 
        // but let's stick to event name for now to keep it simple, or checking tags?
        // If we really need organizer name, we might need to fetch matching organizers first.
      ];
      // If search matches tags?
      // query.$or.push({ Event_tags: { $regex: search, $options: 'i' } });
    }

    if (type && type !== 'all') {
      query.Event_type = type;
    }

    if (eligibility && eligibility !== 'ALL') {
      // If user passes 'IIIT', match 'IIIT' or 'ALL' (assuming 'ALL' events are open to IIIT too)
      // But usually eligibility filter means exact match or "what I am eligible for". 
      // Let's implement exact match for the filter dropdown.
      query.Eligibility_criteria = eligibility;
    }

    if (startDate || endDate) {
      query.Event_start = {};
      if (startDate) query.Event_start.$gte = new Date(startDate);
      if (endDate) query.Event_start.$lte = new Date(endDate);
    }

    // followedClubs filter (requires user to be logged in to know who they follow)
    // This logic depends on having the list of followed club IDs.
    // Assuming client sends a flag 'followedOnly=true' and we have req.user.following
    if (followedClubs === 'true' && req.user && req.user.following) {
      query.Club_id = { $in: req.user.following };
    }

    const events = await Event.find(query).populate('Club_id', 'organizer_name category').sort({ createdAt: -1 });

    // If search includes organizer name, we might need to filter the results in memory if not doing complex aggregation
    let finalEvents = events;
    if (search) {
      // Filter in memory for organizer name (Regex) since we populated Club_id
      const regex = new RegExp(search, 'i');
      finalEvents = events.filter(event =>
        event.name.match(regex) ||
        (event.Club_id && event.Club_id.organizer_name && event.Club_id.organizer_name.match(regex))
      );
    }

    res.status(200).json(finalEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get filtered events for public browsing (specifically for the Browse Page requirements)
// Just reuse getEvents but maybe refine the trend/top logic if needed.

// Get single event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('Club_id', 'organizer_name category description contact_email');
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get events by organizer (for public profile & dashboard)
const getOrganizerEvents = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const query = { Club_id: organizerId };

    // Only include drafts if the requester is the organizer themselves
    const isOwner = req.user && req.user._id === organizerId;
    const includeDrafts = req.query.includeDrafts === 'true';
    if (!isOwner || !includeDrafts) {
      query.Action = { $ne: 'draft' };
    }

    const events = await Event.find(query).sort({ Event_start: 1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get trending events (top 5 by registrations in last 24 hours)
const getTrendingEvents = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await Registration.aggregate([
      // Match registrations from the last 24 hours
      { $match: { Registration_date: { $gte: twentyFourHoursAgo } } },
      // Group by event and count registrations
      { $group: { _id: '$Event_id', count: { $sum: 1 } } },
      // Sort by count descending
      { $sort: { count: -1 } },
      // Limit to top 5
      { $limit: 5 },
      // Lookup event details
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      // Lookup organizer details
      {
        $lookup: {
          from: 'users',
          localField: 'event.Club_id',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      { $unwind: { path: '$organizer', preserveNullAndEmptyArrays: true } },
      // Project the fields we need
      {
        $project: {
          _id: '$event._id',
          name: '$event.name',
          Event_type: '$event.Event_type',
          Event_start: '$event.Event_start',
          Event_end: '$event.Event_end',
          Registration_deadline: '$event.Registration_deadline',
          Event_tags: '$event.Event_tags',
          registrationCount: '$count',
          organizer_name: '$organizer.organizer_name'
        }
      }
    ]);

    res.status(200).json(trending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get upcoming events starting in the next 24 hours
const getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const events = await Event.find({
      Action: { $ne: 'draft' },
      Event_start: { $gte: now, $lte: next24h }
    })
    .populate('Club_id', 'organizer_name category')
    .sort({ Event_start: 1 })
    .limit(10);

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get detailed analytics for a specific event (organizer)
const getEventAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Registration stats
    const totalRegistrations = await Registration.countDocuments({ Event_id: id });
    const confirmedRegistrations = await Registration.countDocuments({ Event_id: id, status: 'confirmed' });
    const pendingPayments = await Registration.countDocuments({ Event_id: id, paymentStatus: 'pending' });
    const approvedPayments = await Registration.countDocuments({ Event_id: id, paymentStatus: 'approved' });
    const rejectedPayments = await Registration.countDocuments({ Event_id: id, paymentStatus: 'rejected' });

    // Revenue
    const revenue = confirmedRegistrations * (event.Registration_fee || 0);

    // Attendance
    const totalAttendance = await Attendance.countDocuments({ Event_id: id });

    // Registration timeline (per day)
    const regTimeline = await Registration.aggregate([
      { $match: { Event_id: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$Registration_date' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Feedback stats
    const feedbackStats = await Feedback.aggregate([
      { $match: { Event_id: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
        }
      }
    ]);

    // Merchandise breakdown (if applicable)
    let merchBreakdown = [];
    if (event.Event_type === 'merchandise') {
      merchBreakdown = await Registration.aggregate([
        { $match: { Event_id: new mongoose.Types.ObjectId(id), status: 'confirmed' } },
        {
          $group: {
            _id: { size: '$merchandiseSelection.size', color: '$merchandiseSelection.color' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
    }

    // Attendance method breakdown
    const attendanceByMethod = await Attendance.aggregate([
      { $match: { Event_id: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: '$method', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      eventName: event.name,
      eventType: event.Event_type,
      totalRegistrations,
      confirmedRegistrations,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      revenue,
      totalAttendance,
      attendanceRate: totalRegistrations > 0 ? Math.round((totalAttendance / totalRegistrations) * 100) : 0,
      regTimeline,
      feedbackStats: feedbackStats[0] || { avgRating: 0, totalReviews: 0 },
      merchBreakdown,
      attendanceByMethod,
      registrationLimit: event.Registrationlimit,
      registrationFee: event.Registration_fee
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update event (editing rules based on status)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.Club_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your event' });
    }

    const now = new Date();
    const isOngoing = new Date(event.Event_start) <= now && new Date(event.Event_end) >= now;
    const isCompleted = new Date(event.Event_end) < now;

    if (event.Action === 'draft') {
      // Free edits on draft
      Object.assign(event, req.body);
    } else if (event.Action === 'publish' && !isOngoing && !isCompleted) {
      // Published: limited edits
      const { Description, Registration_deadline, Registrationlimit, Action } = req.body;
      if (Description) event.Description = Description;
      if (Registration_deadline && new Date(Registration_deadline) > new Date(event.Registration_deadline)) {
        event.Registration_deadline = Registration_deadline;
      }
      if (Registrationlimit && Registrationlimit > event.Registrationlimit) {
        event.Registrationlimit = Registrationlimit;
      }
      if (Action) event.Action = Action;
    } else {
      // Ongoing/Completed: only status change
      if (req.body.Action) event.Action = req.body.Action;
      else return res.status(400).json({ error: 'Cannot edit ongoing/completed events except status' });
    }

    await event.save();
    res.status(200).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getOrganizerEvents,
  getTrendingEvents,
  getUpcomingEvents,
  getEventAnalytics,
  updateEvent
};