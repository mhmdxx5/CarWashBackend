const express           = require('express');
const { body, validationResult } = require('express-validator');
const moment            = require('moment');

const Booking           = require('../Models/Booking');
const WorkingHours      = require('../Models/WorkingHours');        // תבנית שבועית
const WorkingHoursByDate= require('../Models/WorkingHoursByDate');  // חריגים לפי תאריך
const authMiddleware    = require('../middleware/authMiddleware');
const AdminMiddleware   = require('../middleware/AdminMiddleware');
const sendEmail         = require('../utils/sendEmail');

const router = express.Router();

/* ─────────────  יצירת הזמנה  ───────────── */
router.post(
  '/',
  authMiddleware,
  [
    body('services').isArray({ min: 1 }).withMessage('❌ يجب اختيار خدمة واحدة على الأقل'),
    body('services.*.price').isFloat({ min: 0 }).withMessage('❌ السعر غير صالح'),
    body('location').notEmpty().withMessage('❌ الموقع مطلوب'),
    body('date').isISO8601().withMessage('❌ التاريخ غير صالح'),
    body('carNumber').notEmpty().withMessage('❌ رقم السيارة مطلوب'),
    body('phone').notEmpty().withMessage('❌ رقم الهاتف مطلوب'),
    body('electricity').optional().isBoolean(),
    body('water').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      services, location, coordinates,
      date, carNumber, phone, notes,
      electricity = false, water = false,
    } = req.body;

    try {
      /* הגבלה: עד 3 הזמנות בשעה */
      const hourStart = moment(date).startOf('hour').toDate();
      const hourEnd   = moment(date).endOf('hour').toDate();
      const existing  = await Booking.find({ date: { $gte: hourStart, $lte: hourEnd } });

      if (existing.length >= 3)
        return res.status(400).json({ message: '❌ يوجد 3 حجوزات بالفعل في هذه الساعة' });

      /* חישוב מחיר כולל */
      const totalPrice = services.reduce((sum, s) => sum + Number(s.price || 0), 0);

      const booking = await Booking.create({
        user: req.user.id,
        services,
        totalPrice,
        location,
        coordinates,
        date,
        carNumber,
        phone,
        notes,
        electricity,
        water,
      });

      /* אימיילים */
      if (req.user?.email) {
        await sendEmail(
          req.user.email,
          'تم استلام حجزك',
          `<p>مرحبا ${req.user.name}،</p>
           <p>تم استلام طلب الحجز الخاص بك بنجاح!</p>
           <p>📍 الموقع: ${location}</p>
           <p>📅 التاريخ: ${new Date(date).toLocaleString('he-IL')}</p>`
        );
      }

      if (process.env.Admin_EMAIL) {
        await sendEmail(
          process.env.Admin_EMAIL,
          '🚘 تم استلام حجز جديد',
          `<p>مستخدم: <strong>${req.user.name}</strong></p>
           <p>📍 ${location}</p>
           <p>📅 ${new Date(date).toLocaleString('he-IL')}</p>
           <p>📞 ${phone}</p>
           <p>🚗 ${carNumber}</p>
           <p>🔌 كهرباء: ${electricity ? 'כן' : 'לא'} | 💧 מים: ${water ? 'כן' : 'לא'}</p>`
        );
      }

      res.status(201).json({ message: '✅ تم إنشاء الحجز بنجاح', booking });
    } catch (err) {
      console.error('❌ حدث خطأ أثناء إنشاء الحجز:', err);
      res.status(500).json({ message: '❌ حدث خطأ أثناء إنشاء الحجز' });
    }
  }
);

/* ─────────────  זמינות שעות ליום (Override לפי תאריך ⇢ ברירת-מחדל שבועית)  ───────────── */
router.get('/availability', async (req, res) => {
  const { date } = req.query;
  if (!date || !moment(date, 'YYYY-MM-DD', true).isValid())
    return res.status(400).json({ message: '❌ التاريخ غير صالح' });

  const dateStr = moment(date).format('YYYY-MM-DD');
  const dayName = moment(date).format('dddd');       // Sunday…Saturday

  try {
    /* ① חפש חריג ספציפי לתאריך */
    const overrideDoc = await WorkingHoursByDate.findOne({ date: dateStr });

    /* ② אם אין חריג – קח את ברירת-המחדל של יום-בשבוע */
    let workingHours = [];
    if (overrideDoc && overrideDoc.hours.length) {
      workingHours = overrideDoc.hours;
    } else {
      const weekly = await WorkingHours.findOne({ day: dayName });
      workingHours = weekly ? weekly.hours : [];
    }

    if (!workingHours.length)
      return res.json({ date: dateStr, availableHours: [] });

    /* ③ מחסיר שעות שכבר תפוסות */
    const dayStart = moment(date).startOf('day').toDate();
    const dayEnd   = moment(date).endOf('day').toDate();
    const bookings = await Booking.find({ date: { $gte: dayStart, $lte: dayEnd } })
                                  .select('date');

    const booked = bookings.map(b => moment(b.date).format('HH:mm'));
    const availableHours = workingHours.filter(h => !booked.includes(h));

    res.json({ date: dateStr, availableHours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ حدث خطأ أثناء جلب التوفر' });
  }
});

/* ─────────────  ההזמנות שלי  ───────────── */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const list = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ حدث خطأ أثناء جلب الحجوزات' });
  }
});

/* ─────────────  כל ההזמנות (Admin)  ───────────── */
router.get('/', authMiddleware, AdminMiddleware, async (_req, res) => {
  try {
    const list = await Booking.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ حدث خطأ أثناء جلب الحجوزות' });
  }
});

/* ─────────────  עדכון סטטוס  ───────────── */
router.put('/:id/status', authMiddleware, AdminMiddleware, async (req, res) => {
  const { status } = req.body;
  const ALLOWED = ['pending', 'completed', 'canceled'];
  if (!ALLOWED.includes(status))
    return res.status(400).json({ message: '❌ الحالة غير صالحة' });

  try {
    const booking = await Booking.findById(req.params.id)
                                 .populate('user', 'name email');
    if (!booking) return res.status(404).json({ message: '❌ لم يتم العثور على الحجز' });

    booking.status = status;
    await booking.save();

    res.json({ message: '✅ تم تحديث حالة الحجز', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ حدث خطأ أثناء التحديث' });
  }
});

/* ─────────────  בקשת ביטול  ───────────── */
router.post('/send-cancel-request', authMiddleware, async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) return res.status(400).json({ message: 'bookingId חסר בבקשה' });

  try {
    const booking = await Booking.findById(bookingId).populate('user', 'name email');
    if (!booking) return res.status(404).json({ message: 'ההזמנה לא נמצאה' });

    await sendEmail(
      process.env.Admin_EMAIL || 'Admin@example.com',
      '📩 בקשה לביטול הזמנה',
      `<p>משתמש: ${booking.user.name}</p>
       <p>הזמנה: ${booking._id}</p>`
    );
    res.json({ message: '📤 בקשת הביטול נשלחה' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ שגיאה בשליחת הבקשה' });
  }
});

module.exports = router;
