require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { PORT } = require('./config.js');
const connect_db = require('./db.js');
const userRoutes = require('./routes/user.js');
const eventRoutes = require('./routes/events.js');
const registrationRoutes = require('./routes/registrations.js');
const feedbackRoutes = require('./routes/feedback.js');
const forumRoutes = require('./routes/forum.js');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use('/user', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/forum', forumRoutes);

// =====================
// Socket.io - Real-Time Discussion Forum
// =====================
const ForumMessage = require('./models/forummessagemodel');
const Registration = require('./models/registrationmodel');
const Event = require('./models/eventmodels');
const User = require('./models/usermodel');
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.user._id);

  // Join an event's forum room
  socket.on('joinForum', (eventId) => {
    socket.join(`forum:${eventId}`);
    console.log(`User ${socket.user._id} joined forum:${eventId}`);
  });

  socket.on('leaveForum', (eventId) => {
    socket.leave(`forum:${eventId}`);
  });

  // Send message
  socket.on('sendMessage', async (data) => {
    try {
      const { eventId, content, parentId, isAnnouncement } = data;
      const userId = socket.user._id;
      const userRole = socket.user.role;

      if (!content || !content.trim()) return;

      const event = await Event.findById(eventId);
      if (!event) return;

      const isOrganizer = event.Club_id.toString() === userId.toString();
      if (!isOrganizer) {
        const reg = await Registration.findOne({ Event_id: eventId, User_id: userId, status: 'confirmed' });
        if (!reg) return;
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

      io.to(`forum:${eventId}`).emit('newMessage', msg);
    } catch (err) {
      console.error('sendMessage error:', err.message);
    }
  });

  // Delete message
  socket.on('deleteMessage', async ({ messageId, eventId }) => {
    try {
      const msg = await ForumMessage.findById(messageId);
      if (!msg) return;

      const event = await Event.findById(msg.Event_id);
      const isOrganizer = event && event.Club_id.toString() === socket.user._id.toString();
      const isAuthor = msg.User_id.toString() === socket.user._id.toString();

      if (!isOrganizer && !isAuthor) return;

      msg.deleted = true;
      await msg.save();
      io.to(`forum:${eventId}`).emit('messageDeleted', { messageId });
    } catch (err) {
      console.error('deleteMessage error:', err.message);
    }
  });

  // Pin/unpin message
  socket.on('togglePin', async ({ messageId, eventId }) => {
    try {
      const msg = await ForumMessage.findById(messageId);
      if (!msg) return;

      const event = await Event.findById(msg.Event_id);
      if (!event || event.Club_id.toString() !== socket.user._id.toString()) return;

      msg.pinned = !msg.pinned;
      await msg.save();
      io.to(`forum:${eventId}`).emit('messagePinned', { messageId, pinned: msg.pinned });
    } catch (err) {
      console.error('togglePin error:', err.message);
    }
  });

  // React to message
  socket.on('reactMessage', async ({ messageId, eventId, emoji }) => {
    try {
      const msg = await ForumMessage.findById(messageId);
      if (!msg) return;

      const userList = msg.reactions.get(emoji) || [];
      const idx = userList.findIndex(id => id.toString() === socket.user._id.toString());
      if (idx === -1) userList.push(socket.user._id);
      else userList.splice(idx, 1);
      msg.reactions.set(emoji, userList);
      await msg.save();

      io.to(`forum:${eventId}`).emit('messageReacted', {
        messageId,
        reactions: Object.fromEntries(msg.reactions)
      });
    } catch (err) {
      console.error('reactMessage error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.user._id);
  });
});

connect_db();

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
