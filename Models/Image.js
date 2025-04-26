const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  image: {
    type: Buffer, // שמירה ב-Binary Data (Buffer)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
