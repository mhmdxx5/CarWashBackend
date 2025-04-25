// models/SupportRequest.js
const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Support', supportSchema);
