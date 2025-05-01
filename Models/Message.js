const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatRoom : { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content  : { type: String, required: true },
  isAdmin  : { type: Boolean, default: false },
  seen     : { type: Boolean, default: false },         // ← חדש
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
