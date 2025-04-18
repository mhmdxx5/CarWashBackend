const express = require("express");
const Booking = require("../Models/Booking");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { body, validationResult } = require("express-validator");
const sendEmail = require("../utils/sendEmail");
const moment = require("moment");

const router = express.Router();

// إنشاء حجز جديد مع التحقق من صحة البيانات
router.post(
  "/",
  authMiddleware,
  [
    body("services").isArray({ min: 1 }).withMessage("❌ يجب اختيار خدمة واحدة على الأقل"),
    body("location").notEmpty().withMessage("❌ الموقع مطلوب"),
    body("date").isISO8601().withMessage("❌ التاريخ غير صالح"),
    body("carNumber").notEmpty().withMessage("❌ رقم السيارة مطلوب"),
    body("phone").notEmpty().withMessage("❌ رقم الهاتف مطلوب"),
    body("services.*.price").isFloat({ min: 0 }).withMessage("❌ السعر غير صالح"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { services, location, coordinates, date, carNumber, phone, notes } = req.body;

    try {
      console.log('📥 Booking received on server:', req.body); 
      // 🛑 מניעת הזמנה כפולה – רק 3 רכבים לשעה
      const existingBookings = await Booking.find({
        date: { 
          $gte: new Date(date).setMinutes(0, 0, 0), 
          $lt: new Date(date).setMinutes(59, 59, 999) 
        } // מוודא שהחיפוש הוא באותה שעה
      });

      if (existingBookings.length >= 3) {
        return res.status(400).json({ message: "❌ يوجد 3 حجوزات بالفعل في هذه الساعة" });
      }

      const totalPrice = services.reduce((sum, item) => sum + item.price, 0);

      const booking = new Booking({
        user: req.user.id,
        services,
        totalPrice,
        location,
        coordinates,
        date,
        carNumber,
        phone,
        notes
      });

      await booking.save();

      // إرسال بريد للمستخدم
      if (req.user && req.user.email) {
        await sendEmail(
          req.user.email,
          "تم استلام حجزك",
          `<p>مرحبا ${req.user.name}،</p>
           <p>تم استلام طلب الحجز الخاص بك بنجاح!</p>
           <p>📍 الموقع: ${location}</p>
           <p>📅 التاريخ: ${new Date(date).toLocaleString("he-IL")}</p>
           <p>شكراً لاستخدامك خدمتنا!</p>`
        );
      }

      // إرسال بريد للمشرف
      if (process.env.ADMIN_EMAIL) {
        await sendEmail(
          process.env.ADMIN_EMAIL,
          "🚘 تم استلام حجز جديد",
          `<p>📥 تم استلام حجز جديد من المستخدم <strong>${req.user.name}</strong></p>
           <p>📍 الموقع: ${location}</p>
           <p>📅 التاريخ: ${new Date(date).toLocaleString("he-IL")}</p>
           <p>📞 الهاتف: ${phone}</p>
           <p>🚗 رقم السيارة: ${carNumber}</p>
           <p>🧾 عدد الخدمات: ${services.length}</p>`
        );
      }

      res.status(201).json({ message: "✅ تم إنشاء الحجز بنجاح", booking });
    } catch (error) {
      console.error("❌ حدث خطأ أثناء إنشاء الحجز:", error);
      res.status(500).json({ message: "❌ حدث خطأ أثناء إنشاء الحجز" });
    }
  }
);

// ✅ جلب الساعات المتاحة ليوم معين
router.get("/availability", async (req, res) => {
  const { date } = req.query;

  if (!date || !moment(date, "YYYY-MM-DD", true).isValid()) {
    return res.status(400).json({ message: "❌ التاريخ غير صالح" });
  }

  const workingHours = [
    "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00",
    "16:00", "17:00"
  ];

  try {
    const startOfDay = moment(date).startOf("day").toDate();
    const endOfDay = moment(date).endOf("day").toDate();

    const bookings = await Booking.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const bookedHours = bookings.map(b => moment(b.date).format("HH:mm"));
    const availableHours = workingHours.filter(hour => !bookedHours.includes(hour));

    res.json({ date, availableHours });
  } catch (error) {
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب التوفر" });
  }
});

// الحصول على جميع الحجوزات الخاصة بالمستخدم
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب الحجوزات" });
  }
});

// جلب جميع الحجوزات (للمشرف فقط)
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب الحجوزات" });
  }
});

// تحديث حالة الحجز (فقط للمشرف)
router.put("/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;

  const allowed = ["pending", "completed", "canceled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "❌ الحالة غير صالحة" });
  }

  try {
    const booking = await Booking.findById(req.params.id).populate("user", "name email");

    if (!booking) {
      return res.status(404).json({ message: "❌ لم يتم العثور على الحجز" });
    }

    booking.status = status;
    await booking.save();

    // إرسال بريد للمستخدم عند تحديث الحالة
    if (booking.user && booking.user.email) {
      let statusMessage = "";

      if (status === "completed") {
        statusMessage = "✅ تم الانتهاء من حجزك بنجاح";
      } else if (status === "canceled") {
        statusMessage = "❌ تم إلغاء حجزك";
      } else {
        statusMessage = "تم تحديث حالة الحجز الخاصة بك.";
      }

      await sendEmail(
        booking.user.email,
        "📢 تحديث حالة الحجز",
        `<p>مرحبا ${booking.user.name}،</p>
         <p>${statusMessage}</p>
         <p>📍 الموقع: ${booking.location}</p>
         <p>📅 التاريخ: ${new Date(booking.date).toLocaleString("he-IL")}</p>
         <p>📄 الحالة الجديدة: <strong>${status}</strong></p>
         <p>شكراً لاستخدامك خدمتنا!</p>`
      );
    }

    res.json({ message: "✅ تم تحديث حالة الحجز", booking });
  } catch (error) {
    res.status(500).json({ message: "❌ حدث خطأ أثناء التحديث" });
  }
});
// ✅ בקשת ביטול של הזמנה – שליחת מייל לאדמין
router.post("/send-cancel-request", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "❌ bookingId חסר בבקשה" });

    const booking = await Booking.findById(bookingId).populate("user", "name email");
    if (!booking) return res.status(404).json({ message: "❌ ההזמנה לא נמצאה" });

    const emailContent = `
      <p>📢 בקשה לביטול הזמנה:</p>
      <p>👤 שם המשתמש: <strong>${booking.user.name}</strong></p>
      <p>📧 מייל: ${booking.user.email}</p>
      <p>🆔 מזהה ההזמנה: ${booking._id}</p>
      <p>📍 מיקום: ${booking.location}</p>
      <p>📅 תאריך: ${new Date(booking.date).toLocaleString("he-IL")}</p>
    `;

    await sendEmail(
      "mhmdatamny8@gmail.com",
      "📩 בקשה לביטול הזמנה",
      emailContent
    );

    res.json({ message: "📤 נשלחה בקשת ביטול לאדמין" });
  } catch (error) {
    console.error("❌ שגיאה בשליחת בקשת ביטול:", error);
    res.status(500).json({ message: "❌ שגיאה בשליחת בקשת הביטול" });
  }
});


module.exports = router;
