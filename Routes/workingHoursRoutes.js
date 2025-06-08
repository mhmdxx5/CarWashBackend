// routes/workingHoursRoutes.js
const express = require('express');
const WorkingHours = require('../Models/WorkingHours');
const AdminMiddleware = require('../middleware/AdminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// קבלת כל הימים והשעות
router.get('/', async (_req, res) => {
  const all = await WorkingHours.find();
  res.json(all);
});

// עדכון שעות ליום מסוים (admin only)
router.put('/:day', authMiddleware, AdminMiddleware, async (req, res) => {
  const { day } = req.params;
  const { hours } = req.body;

  try {
    const updated = await WorkingHours.findOneAndUpdate(
      { day },
      { hours },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ לא ניתן לעדכן שעות' });
  }
});

module.exports = router;
