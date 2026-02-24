const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedbackSchema = new Schema({
  Event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  User_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
}, { timestamps: true });

// One feedback per user per event
FeedbackSchema.index({ Event_id: 1, User_id: 1 }, { unique: true });

const Feedback = mongoose.model('Feedback', FeedbackSchema);
module.exports = Feedback;
