const express = require("express");
const Product = require("../Models/Product");
const authMiddleware = require("../middleware/authMiddleware");
const AdminMiddleware = require("../middleware/AdminMiddleware");

const router = express.Router();

// 📌 إضافة خدمة جديدة (فقط للمشرف)
router.post("/", authMiddleware, AdminMiddleware, async (req, res) => {
  const { name, description, price, duration, type } = req.body;

  try {
    const product = new Product({ name, description, price, duration, type });
    await product.save();
    res.status(201).json({ message: "✅ تم إنشاء الخدمة بنجاح", product });
  } catch (error) {
    res.status(500).json({ message: "❌ حدث خطأ أثناء إنشاء الخدمة" });
  }
});

// 📌 جلب جميع الخدمات (مفتوح للجميع)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب الخدمات" });
  }
});

// 📌 حذف خدمة (فقط للمشرف)
router.delete("/:id", authMiddleware, AdminMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "🗑️ تم حذف الخدمة بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "❌ حدث خطأ أثناء حذف الخدمة" });
  }
});

// 📌 עדכון שירות קיים (PUT) – רק למנהל
router.put("/:id", authMiddleware, AdminMiddleware, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "✅ השירות עודכן בהצלחה", product: updated });
  } catch (error) {
    console.error("❌ שגיאה בעדכון שירות:", error);
    res.status(500).json({ message: "❌ שגיאה בעדכון השירות" });
  }
});

module.exports = router;
