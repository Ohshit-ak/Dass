const ForumMessage = require('../models/forummessagemodel');
const Registration = require('../models/registrationmodel');
const Event = require('../models/eventmodels');
const User = require('../models/usermodel');

// =====================
// GET MESSAGES (REST fallback & initial load)
// =====================
const getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const messages = await ForumMessage.find({ Event_id: eventId, deleted: false })
      .sort({ pinned: -1, createdAt: 1 })
      .limit(200);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// POST MESSAGE (REST fallback)
// =====================
const postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, parentId, isAnnouncement } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!content || !content.trim()) return res.status(400).json({ error: 'Message content required' });

    // Only registered participants or the organizer can post
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const isOrganizer = event.Club_id.toString() === userId.toString();
    if (!isOrganizer) {
      const reg = await Registration.findOne({ Event_id: eventId, User_id: userId, status: 'confirmed' });
      if (!reg) return res.status(403).json({ error: 'Only registered participants and the organizer can post' });
    }

    const user = await User.findById(userId).select('first_name organizer_name');
    const userName = userRole === 'club' ? (user.organizer_name || user.first_name) : user.first_name;

    const msg = await ForumMessage.create({
      Event_id: eventId,
      User_id: userId,
      userName,
      userRole,
      content: content.trim(),
      parentId: parentId || null,
      isAnnouncement: isOrganizer ? !!isAnnouncement : false
    });

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// DELETE MESSAGE (organizer moderation)
// =====================
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const msg = await ForumMessage.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const event = await Event.findById(msg.Event_id);
    const isOrganizer = event && event.Club_id.toString() === userId.toString();
    const isAuthor = msg.User_id.toString() === userId.toString();

    if (!isOrganizer && !isAuthor) {
      return res.status(403).json({ error: 'Only the organizer or author can delete messages' });
    }

    msg.deleted = true;
    await msg.save();
    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// PIN / UNPIN MESSAGE (organizer only)
// =====================
const togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const msg = await ForumMessage.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const event = await Event.findById(msg.Event_id);
    if (!event || event.Club_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the organizer can pin/unpin messages' });
    }

    msg.pinned = !msg.pinned;
    await msg.save();
    res.status(200).json({ message: msg.pinned ? 'Message pinned' : 'Message unpinned', pinned: msg.pinned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// REACT TO MESSAGE
// =====================
const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body; // e.g. '👍', '❤️', '😂'
    const userId = req.user._id;

    if (!emoji) return res.status(400).json({ error: 'emoji required' });

    const msg = await ForumMessage.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    // Toggle reaction
    const userList = msg.reactions.get(emoji) || [];
    const idx = userList.findIndex(id => id.toString() === userId.toString());
    if (idx === -1) {
      userList.push(userId);
    } else {
      userList.splice(idx, 1);
    }
    msg.reactions.set(emoji, userList);
    await msg.save();

    res.status(200).json({ reactions: Object.fromEntries(msg.reactions) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMessages,
  postMessage,
  deleteMessage,
  togglePinMessage,
  reactToMessage
};
