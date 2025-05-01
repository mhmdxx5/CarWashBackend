/* ────────────────────────────────────────────────────────── */
/*  /routes/chatRoutes.js                                    */
/* ────────────────────────────────────────────────────────── */
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const ChatRoom = require('../Models/ChatRoom');
const Message  = require('../Models/Message');
const User     = require('../Models/User');
const auth     = require('../middleware/authMiddleware');

/* ----- Cloudinary ----- */
const cloudinary = require('cloudinary').v2;          //  npm i cloudinary
cloudinary.config({
  cloud_name: 'dt3mmadat',
  api_key   : 363231651115672,
  api_secret: 'zBmDmxEplFzt6RLvwoY8kVE3BiQ',
});
/* Multer – קובץ זמני בזיכרון (buffer) */
const storage = multer.memoryStorage();
const upload  = multer({ storage });

/* ───────── 1. start room ───────── */
router.post('/start', auth, async (req,res)=>{
  const { targetUser } = req.body;
  const requesterId = req.user.id;

  if (targetUser) {                                   // admin → user
    if (req.user.role !== 'admin')
      return res.status(403).json({ message:'Only admin' });

    let room = await ChatRoom.findOne({ user: targetUser });
    if (!room) room = await ChatRoom.create({ user: targetUser });
    await ChatRoom.updateOne({ _id: room._id },{ $addToSet:{ admins: requesterId }});
    return res.json(room);
  }

  let room = await ChatRoom.findOne({ user: requesterId });
  if (!room) room = await ChatRoom.create({ user: requesterId });
  res.json(room);
});

/* ───────── 2. users list (admin only) ───────── */
router.get('/', auth, async (req,res)=>{
  if (req.user.role!=='admin') return res.status(403).json({message:'Access denied'});
  const users = await User.find({ role:'user' }).select('_id name email');
  res.json(users);
});

/* ───────── 3. rooms list (admin) ───────── */
router.get('/rooms', auth, async (req,res)=>{
  if (req.user.role!=='admin') return res.status(403).json({message:'Access denied'});
  const rooms = await ChatRoom.find().populate('user').sort({ updatedAt:-1 });
  res.json(rooms);
});

/* ───────── 4. get messages ───────── */
router.get('/:roomId/messages', auth, async (req,res)=>{
  const msgs = await Message.find({ chatRoom:req.params.roomId }).sort({ createdAt:1 });
  res.json(msgs);
});

/* ───────── 5. send TEXT message ───────── */
router.post('/:roomId/messages', auth, async (req,res)=>{
  const { content } = req.body;
  const isAdmin = req.user.role==='admin';

  const msg = await Message.create({
    chatRoom : req.params.roomId,
    sender   : req.user.id,
    content,
    msgType  : 'text',
    isAdmin,
    seen     : false,
  });

  await ChatRoom.findByIdAndUpdate(req.params.roomId,
    { lastMessage: content, updatedAt: Date.now() });

  req.io.to(req.params.roomId).emit('receiveMessage', msg);
  res.json(msg);
});

/* ───────── 6. upload IMAGE ───────── */
router.post('/:roomId/upload', auth, upload.single('file'), async (req,res)=>{
  if (!req.file) return res.status(400).json({ message:'No file' });

  /* העלאה ל-Cloudinary */
  try {
    const cldRes = await cloudinary.uploader.upload_stream(
      { folder: 'chatImages', resource_type: 'image' },
      async (error, result)=>{
        if (error || !result)
          return res.status(500).json({ message:'Cloudinary error', error });

        const msg = await Message.create({
          chatRoom : req.params.roomId,
          sender   : req.user.id,
          msgType  : 'image',
          imageUrl : result.secure_url,            // URL מלא ב-Cloudinary
          isAdmin  : req.user.role==='admin',
          seen     : false,
        });

        await ChatRoom.findByIdAndUpdate(req.params.roomId,
          { lastMessage:'📷 Image', updatedAt:Date.now() });

        req.io.to(req.params.roomId).emit('receiveMessage', msg);
        res.json(msg);
      }
    );
    cldRes.end(req.file.buffer);                   // מזין את ה-buffer ל-stream
  } catch(err){
    console.error(err);
    res.status(500).json({ message:'Upload failed' });
  }
});

/* ───────── 7. mark seen ───────── */
router.post('/:roomId/seen', auth, async (req,res)=>{
  await Message.updateMany(
    { chatRoom:req.params.roomId, sender:{ $ne:req.user.id }, seen:false },
    { $set:{ seen:true } }
  );
  req.io.to(req.params.roomId).emit('seen',{ by:req.user.id });
  res.json({ ok:true });
});

module.exports = router;
