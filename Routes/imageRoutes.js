const express = require('express');
const multer = require('multer');
const path = require('path');
const Image = require('../Models/Image');
const router = express.Router();

// הגדרת Multer לשמירה על הדיסק
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // התיקייה שהכנת
  },
  filename: (req, file, cb) => {
    const uniqueName = `img_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

// API להעלאת תמונה
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'אין קובץ להעלות' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const image = new Image({
      url: imageUrl,
    });

    await image.save();

    // מחק תמונה ישנה אם יש יותר מ-3
    const images = await Image.find().sort({ createdAt: -1 });
    if (images.length > 3) {
      const oldest = images[images.length - 1];
      await Image.deleteOne({ _id: oldest._id });
    }

    res.status(200).json({ message: 'תמונה הועלתה בהצלחה!', image });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'שגיאה בהעלאת התמונה' });
  }
});

// API לשליפת 3 התמונות האחרונות
router.get('/get-latest-images', async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 }).limit(3);
    res.json(images);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'שגיאה בטעינת התמונות' });
  }
});

module.exports = router;
