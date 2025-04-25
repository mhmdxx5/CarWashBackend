const express = require('express');
const router = express.Router();
const SupportRequest = require('../Models/Support');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// משתמש שולח בקשת תמיכה
router.post('/', protect, async (req, res) => {
  const { message } = req.body;
  const support = await SupportRequest.create({ user: req.user._id, message });
  res.status(201).json(support);
});

// מנהל רואה את כל הבקשות
router.get('/', protect, adminOnly, async (req, res) => {
  const requests = await SupportRequest.find().populate('user', 'name email');
  res.json(requests);
});

// מנהל מעדכן סטטוס
router.put('/:id', protect, adminOnly, async (req, res) => {
  const { status } = req.body;
  const request = await SupportRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'לא נמצא' });
  request.status = status;
  await request.save();
  res.json(request);
});
module.exports = router;