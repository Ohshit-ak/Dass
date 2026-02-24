const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
  Event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  Registration_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  User_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // organizer who scanned
  method: { type: String, enum: ['qr_scan', 'manual_override'], default: 'qr_scan' },
  overrideReason: { type: String, default: '' } // for manual override audit
}, { timestamps: true });

// Unique compound index: one attendance per user per event
AttendanceSchema.index({ Event_id: 1, User_id: 1 }, { unique: true });
AttendanceSchema.index({ Event_id: 1, ticketId: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', AttendanceSchema);
module.exports = Attendance;
