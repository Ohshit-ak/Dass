const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ForumMessageSchema = new Schema({
  Event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  User_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true }, // cached display name
  userRole: { type: String, enum: ['student', 'club', 'sysadmin'], required: true },
  content: { type: String, required: true, maxlength: 2000 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumMessage', default: null }, // threading
  pinned: { type: Boolean, default: false },
  isAnnouncement: { type: Boolean, default: false },
  reactions: {
    type: Map,
    of: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: {}
  },
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

const ForumMessage = mongoose.model('ForumMessage', ForumMessageSchema);
module.exports = ForumMessage;
