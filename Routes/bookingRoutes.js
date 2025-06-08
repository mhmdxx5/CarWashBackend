/*  rutas / bookings – יצירת הזמנה, זמינות שעות, CRUD-אדמין */
const express = require('express');
const { body, validationResult } = require('express-validator');
const moment  = require('moment');

const Booking            = require('../Models/Booking');
const WorkingHours       = require('../Models/WorkingHours');
const WorkingHoursByDate = require('../Models/WorkingHoursByDate');
const authMiddleware     = require('../middleware/authMiddleware');
const adminMiddleware    = require('../middleware/AdminMiddleware');
const sendEmail          = require('../utils/sendEmail');

const router = express.Router();

/* ─────────────────────────  POST /api/bookings  ───────────────────────── */
router.post(
  '/',
  authMiddleware,
  [
    body('services').isArray({ min:1 }).withMessage('❌ يجب اختيار خدمة واحدة على الأقل'),
    body('services.*.price').isFloat({ min:0 }).withMessage('❌ السعر غير صالح'),
    body('location').notEmpty().withMessage('❌ الموقع مطلوب'),
    body('date').isISO8601().withMessage('❌ التاريخ غير صالح'),
    body('carNumber').notEmpty().withMessage('❌ رقم السيارة مطلوب'),
    body('phone').notEmpty().withMessage('❌ رقم الهاتف مطلوب'),
    body('serviceMode').isIn(['home','pickup']).withMessage('❌ نوع الخدمة غير صالح'),
    body('electricity').optional().isBoolean(),
    body('water').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      services, location, coordinates,
      date, carNumber, carCode = '',
      phone, notes, serviceMode,
      electricity = false, water = false,
    } = req.body;

    try {
      /* ‎— הגבלת ‎3 הזמנות לאותה שעה — */
      const start = moment(date).startOf('hour').toDate();
      const end   = moment(date).endOf('hour').toDate();
      const existing = await Booking.find({ date:{ $gte:start, $lte:end } });
      if (existing.length >= 3)
        return res.status(400).json({ message:'❌ يوجد 3 حجوزات بالفعل في هذه الساعة' });

      /* סכום בסיסי + ‎20 ₪ תוספת לשטיפה-בבית */
      const base = services.reduce((s,v)=>s + Number(v.price||0),0);
      const homeExtraPrice = serviceMode === 'home' ? 20 : 0;
      const totalPrice     = base + homeExtraPrice;

      const booking = await Booking.create({
        user: req.user.id,
        services,
        homeExtraPrice,
        totalPrice,
        location,
        coordinates,
        date,
        carNumber,
        carCode,
        phone,
        notes,
        serviceMode,
        electricity : serviceMode === 'home' ? electricity : false,
        water       : serviceMode === 'home' ? water       : false,
      });

      /* ­---­ אימיילים ל-לקוח ולאדמין (אם קיים) ­--- */
      if (req.user?.email) {
        await sendEmail(
          req.user.email,
          'تم استلام حجزك',
          `<p>مرحباً ${req.user.name}،</p>
           <p>تم استلام طلب الحجز الخاص بك بنجاح.</p>
           <p>📍 الموقع: ${location}</p>
           <p>📅 التاريخ: ${new Date(date).toLocaleString('he-IL')}</p>`
        );
      }
      if (process.env.Admin_EMAIL) {
        await sendEmail(
          process.env.Admin_EMAIL,
          '🚘 تم استلام حجز جديد',
          `<p>المستخدم: <strong>${req.user.name}</strong></p>
           <p>📍 ${location}</p>
           <p>📅 ${new Date(date).toLocaleString('he-IL')}</p>
           <p>📞 ${phone}</p>
           <p>🚗 ${carNumber}</p>`
        );
      }

      res.status(201).json({ message:'✅ تم إنشاء الحجز بنجاح', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message:'❌ حدث خطأ أثناء إنشاء الحجز' });
    }
  }
);

/* ─────────────────────────  GET /availability  ───────────────────────── */
router.get('/availability', async (req,res)=>{
  const { date } = req.query;
  if(!date || !moment(date,'YYYY-MM-DD',true).isValid())
    return res.status(400).json({ message:'❌ التاريخ غير صالح' });

  const dateStr = moment(date).format('YYYY-MM-DD');
  const dayName = moment(date).format('dddd');

  try{
    /* ① חריג ספציפי */
    const override = await WorkingHoursByDate.findOne({ date:dateStr });
    let workingHours = [];
    if (override && override.hours.length) workingHours = override.hours;
    else {
      const weekly = await WorkingHours.findOne({ day:dayName });
      workingHours = weekly ? weekly.hours : [];
    }

    if(!workingHours.length) return res.json({ date:dateStr, availableHours:[] });

    /* ③ חסימת שעות תפוסות */
    const dayStart = moment(date).startOf('day').toDate();
    const dayEnd   = moment(date).endOf('day').toDate();
    const booked   = await Booking.find({ date:{ $gte:dayStart, $lte:dayEnd } })
                                  .select('date');
    const taken = booked.map(b=>moment(b.date).format('HH:mm'));
    const availableHours = workingHours.filter(h=>!taken.includes(h));

    res.json({ date:dateStr, availableHours });
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'❌ حدث خطأ أثناء جلب التوفر' });
  }
});

/* ─────────────────────────  GET /my  ───────────────────────── */
router.get('/my', authMiddleware, async (req,res)=>{
  try{
    const list = await Booking.find({ user:req.user.id }).sort({ createdAt:-1 });
    res.json(list);
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'❌ حدث خطأ أثناء جلب الحجوزات' });
  }
});

/* ─────────────────────────  GET /  (Admin) ───────────────────────── */
router.get('/', authMiddleware, adminMiddleware, async (_req,res)=>{
  try{
    const list = await Booking.find()
      .populate('user','name email')
      .sort({ createdAt:-1 });
    res.json(list);
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'❌ حدث خطأ أثناء جلب الحجوزات' });
  }
});

/* ─────────────────────────  PUT /:id/status  (Admin) ───────────────────────── */
router.put('/:id/status', authMiddleware, adminMiddleware, async (req,res)=>{
  const { status } = req.body;
  if (!['pending','completed','canceled'].includes(status))
    return res.status(400).json({ message:'❌ الحالة غير صالحة' });

  try{
    const booking = await Booking.findById(req.params.id).populate('user','name email');
    if(!booking) return res.status(404).json({ message:'❌ لم يتم العثور على الحجز' });

    booking.status = status;
    await booking.save();
    res.json({ message:'✅ تم تحديث حالة الحجز', booking });
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'❌ حدث خطأ أثناء التحديث' });
  }
});

/* ─────────────────────────  POST /send-cancel-request  ───────────────────────── */
router.post('/send-cancel-request', authMiddleware, async (req,res)=>{
  const { bookingId } = req.body;
  if(!bookingId) return res.status(400).json({ message:'bookingId مطلوب' });
  try{
    const booking = await Booking.findById(bookingId).populate('user','name email');
    if(!booking) return res.status(404).json({ message:'الحجز غير موجود' });

    await sendEmail(
      process.env.Admin_EMAIL || 'admin@example.com',
      '📩 طلب إلغاء حجز',
      `<p>المستخدم: ${booking.user.name}</p><p>الحجز: ${booking._id}</p>`
    );
    res.json({ message:'📤 تم إرسال طلب الإلغاء' });
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'❌ خطأ أثناء الإرسال' });
  }
});

module.exports = router;
