const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatRoom : { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content  : { type: String },                     // טקסט (אופציונלי לתמונה)
  msgType  : { type: String, enum:['text','image'], default:'text' },
  imageUrl : { type: String },                     // URL של התמונה
  isAdmin  : { type: Boolean, default: false },
  seen     : { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
