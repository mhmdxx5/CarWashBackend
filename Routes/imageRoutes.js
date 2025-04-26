const express = require('express');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const Image = require('../Models/Image');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      async (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'שגיאה בהעלאה ל־Cloudinary' });
        }

        // שמור את כתובת התמונה ב־MongoDB
        const image = new Image({
          url: result.secure_url, // URL מלא מהענן
          public_id: result.public_id, // מזהה ב־Cloudinary אם תרצה למחוק בעתיד
        });

        await image.save();

        res.status(200).json({ message: 'תמונה הועלתה בהצלחה!', image });
      }
    );

    result.end(req.file.buffer); // שגר את התמונה
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'שגיאה כללית בהעלאה' });
  }
});

// שליפת 3 תמונות אחרונות
router.get('/get-latest-images', async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 }).limit(3);
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'שגיאה בשליפת תמונות' });
  }
});

module.exports = router;
