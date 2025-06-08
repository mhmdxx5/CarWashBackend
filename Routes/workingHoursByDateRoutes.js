const express = require('express');
const WorkingHoursByDate = require('../Models/WorkingHoursByDate');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/AdminMiddleware');

const router = express.Router();

// GET /api/working-hours/date/:date
router.get('/date/:date', auth, admin, async (req, res) => {
  const { date } = req.params;           // 'YYYY-MM-DD'
  const doc = await WorkingHoursByDate.findOne({ date });
  if (!doc) return res.status(404).json({ hours: [] });
  res.json(doc);
});

// PUT /api/working-hours/date/:date
router.put('/date/:date', auth, admin, async (req, res) => {
  const { date } = req.params;
  const { hours } = req.body;
  try {
    const updated = await WorkingHoursByDate.findOneAndUpdate(
      { date },
      { hours },
      { upsert: true, new: true },
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ לא ניתן לעדכן שעות' });
  }
});

module.exports = router;
