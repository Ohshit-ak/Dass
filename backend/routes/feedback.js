const express = require('express');
const { submitFeedback, getEventFeedback, getMyFeedback } = require('../controllers/feedbackcontroller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, submitFeedback);
router.get('/event/:eventId', getEventFeedback);
router.get('/my/:eventId', requireAuth, getMyFeedback);

module.exports = router;
