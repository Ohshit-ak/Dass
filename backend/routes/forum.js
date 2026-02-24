const express = require('express');
const { getMessages, postMessage, deleteMessage, togglePinMessage, reactToMessage } = require('../controllers/forumcontroller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:eventId', getMessages);
router.post('/:eventId', requireAuth, postMessage);
router.delete('/message/:messageId', requireAuth, deleteMessage);
router.patch('/message/:messageId/pin', requireAuth, togglePinMessage);
router.post('/message/:messageId/react', requireAuth, reactToMessage);

module.exports = router;
