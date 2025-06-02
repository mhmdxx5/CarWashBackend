const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// تسجيل مستخدم جديد
router.post("/register", async (req, res) => {
  let { name, email, password, role } = req.body;

  // Normalize email
  email = email.toLowerCase().trim();

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: "تم إنشاء الحساب بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "حدث خطأ ما" });
  }
});

// تسجيل الدخول
router.post("/login", async (req, res) => {
  let { email, password } = req.body;

  // Normalize email
  email = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "المستخدم غير موجود" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "كلمة المرور غير صحيحة" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "حدث خطأ ما" });
  }
});

// Routes/userRoutes.js  – החזרה של כל ה-users למנהל
router.get("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied" });

  const roleFilter = req.query.role ? { role: req.query.role } : {};
  const users = await User.find(roleFilter).select("_id name email");
  res.json(users);
});

// حذف مستخدم
router.delete("/:id", authMiddleware, async (req, res) => {
  const userId = req.params.id;

  try {
    await User.findByIdAndDelete(userId);
    res.json({ message: "تم حذف المستخدم بنجاح" });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء الحذف" });
  }
});

module.exports = router;
