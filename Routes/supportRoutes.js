const express = require('express');
const router = express.Router();
const SupportRequest = require('../Models/Support');
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
// משתמש שולח בקשת תמיכה
router.post('/', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'הודעה חסרה' });

  try {
    const support = await SupportRequest.create({
      user: req.user._id,
      message,
    });
    res.status(201).json(support);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה ביצירת פנייה' });
  }
});

// מנהל רואה את כל הבקשות
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const supportRequests = await SupportRequest.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(supportRequests);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בשליפת הבקשות' });
  }
});

// מנהל משנה סטטוס
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  try {
    const request = await SupportRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'פנייה לא נמצאה' });

    request.status = status;
    await request.save();
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בעדכון הסטטוס' });
  }
});

module.exports = router;
