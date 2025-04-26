const express = require('express');
const multer = require('multer');
const Image = require('../Models/Image'); // ייבוא המודל של התמונות
const router = express.Router();

// הגדרת Multer לאחסון התמונות ב־Buffer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API להעלאת תמונה
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // שמירה של התמונה החדשה
    const image = new Image({
      image: req.file.buffer, // שומר את התמונה ב־Buffer
    });

    // שמור את התמונה החדשה
    await image.save();

    // ודא שיש רק 3 תמונות
    const imageCount = await Image.countDocuments();
    if (imageCount > 3) {
      // מחק את התמונה הישנה ביותר אם יש יותר מ-3 תמונות
      const oldestImage = await Image.findOne().sort({ createdAt: 1 }); // תמונה ישנה ביותר
      await Image.deleteOne({ _id: oldestImage._id }); // מחק אותה
    }

    res.status(200).json({ message: 'תמונה הועלתה בהצלחה!', image: image });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'שגיאה בהעלאת התמונה' });
  }
});

// API לשליפת 3 התמונות האחרונות
router.get('/get-latest-images', async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 }).limit(3); // מקבל את 3 התמונות האחרונות
    res.json(images);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'שגיאה בטעינת התמונות' });
  }
});

module.exports = router;
