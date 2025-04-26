const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true }, // כתובת תמונה ב־Cloudinary
  public_id: { type: String, required: true }, // מזהה למחיקה עתידית
  createdAt: { type: Date, default: Date.now },
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
