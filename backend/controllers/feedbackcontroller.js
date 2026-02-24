const Feedback = require('../models/feedbackmodel');
const Registration = require('../models/registrationmodel');
const Event = require('../models/eventmodels');
const mongoose = require('mongoose');

// =====================
// SUBMIT FEEDBACK (anonymous — only for attended events)
// =====================
const submitFeedback = async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!eventId || !rating) return res.status(400).json({ error: 'eventId and rating are required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    // Check user registered and event is completed
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (new Date(event.Event_end) > new Date()) {
      return res.status(400).json({ error: 'Feedback can only be submitted after the event ends' });
    }

    const reg = await Registration.findOne({ Event_id: eventId, User_id: userId, status: 'confirmed' });
    if (!reg) return res.status(403).json({ error: 'You can only give feedback for events you attended' });

    // Check if already submitted — feedback is not editable
    const existing = await Feedback.findOne({ Event_id: eventId, User_id: userId });
    if (existing) {
      return res.status(400).json({ error: 'Feedback already submitted and cannot be edited' });
    }

    const feedback = await Feedback.create({
      Event_id: eventId,
      User_id: userId,
      rating,
      comment: comment || ''
    });

    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Feedback already submitted for this event' });
    }
    res.status(500).json({ error: error.message });
  }
};

// =====================
// GET FEEDBACK FOR EVENT (organizer or public view — anonymous)
// =====================
const getEventFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { minRating, maxRating } = req.query;

    const filter = { Event_id: eventId };
    if (minRating) filter.rating = { ...filter.rating, $gte: Number(minRating) };
    if (maxRating) filter.rating = { ...filter.rating, $lte: Number(maxRating) };

    // Anonymous: don't return user details
    const feedbacks = await Feedback.find(filter)
      .select('rating comment createdAt -_id')
      .sort({ createdAt: -1 });

    // Aggregate stats
    const stats = await Feedback.aggregate([
      { $match: { Event_id: new mongoose.Types.ObjectId(eventId) } },
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

    res.status(200).json({
      feedbacks,
      stats: stats[0] || { avgRating: 0, totalReviews: 0, rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// CHECK IF USER SUBMITTED FEEDBACK
// =====================
const getMyFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;
    const feedback = await Feedback.findOne({ Event_id: eventId, User_id: userId });
    res.status(200).json({ feedback: feedback || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  submitFeedback,
  getEventFeedback,
  getMyFeedback
};
