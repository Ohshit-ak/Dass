const express = require('express');
const { createEvent, getEvents, getEventById, getOrganizerEvents, getTrendingEvents, getUpcomingEvents, getEventAnalytics, updateEvent } = require('../controllers/eventscontroller');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/trending', getTrendingEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/organizer/:organizerId', optionalAuth, getOrganizerEvents);
router.get('/:id', getEventById);
router.get('/:id/analytics', requireAuth, requireRole('club'), getEventAnalytics);

// Protected routes
router.post('/create', requireAuth, requireRole('club'), createEvent);
router.patch('/:id', requireAuth, requireRole('club'), updateEvent);

module.exports = router;