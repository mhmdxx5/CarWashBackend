const express = require('express');
const router = express.Router();
const ChatRoom = require('../Models/ChatRoom');
const Message = require('../Models/Message');
const User = require('../Models/User');
const auth = require('../middleware/authMiddleware'); // לוודא שיש middleware שמוודא התחברות

// יצירת צ'אט חדש או קיים ללקוח
router.post('/start', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    let chat = await ChatRoom.findOne({ user: userId });
    if (!chat) {
      chat = await ChatRoom.create({ user: userId });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// Routes/userRoutes.js
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const users = await User.find({ role: 'user' }).select('_id name email');
    res.json(users);
  });
// קבלת כל הצ'אטים (רק לאדמין)
router.get('/rooms', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  const rooms = await ChatRoom.find().populate('user').sort({ updatedAt: -1 });
  res.json(rooms);
});

// קבלת כל ההודעות בצ׳אט
router.get('/:roomId/messages', auth, async (req, res) => {
  const { roomId } = req.params;
  const messages = await Message.find({ chatRoom: roomId }).sort({ createdAt: 1 });
  res.json(messages);
});

// שליחת הודעה בצ׳אט
router.post('/:roomId/messages', auth, async (req, res) => {
  const { roomId } = req.params;
  const { content } = req.body;
  try {
    const isAdmin = req.user.role === 'admin';
    const message = await Message.create({
      chatRoom: roomId,
      sender: req.user.id,
      content,
      isAdmin
    });

    await ChatRoom.findByIdAndUpdate(roomId, {
      lastMessage: content,
      $addToSet: isAdmin ? { admins: req.user.id } : {},
    });

    // Socket.IO: שליחה בזמן אמת (אם יש req.io)
    if (req.io) {
      req.io.to(roomId).emit('receiveMessage', message);
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Error sending message' });
  }
});

module.exports = router;