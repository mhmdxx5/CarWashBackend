const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: String,
}, { timestamps: true });

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);

