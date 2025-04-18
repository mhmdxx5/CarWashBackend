require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./Routes/userRoutes");


// إنشاء التطبيق
const app = express();
const bookingRoutes = require("./Routes/bookingRoutes");
const productRoutes = require("./Routes/productRoutes");

// استخدام Middleware


app.use(express.json()); // لمعالجة البيانات بصيغة JSON
app.use(cors()); // للسماح بالاتصال من الـ Frontend
app.use("/api/users", userRoutes);// register user
app.use("/api/bookings", bookingRoutes);
app.use("/api/products", productRoutes); // راوت إدارة الخدمات
// إعداد قاعدة البيانات
console.log(process.env.MONGO_URI)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ Error connecting to MongoDB:", err));

// الصفحة الرئيسية لاختبار السيرفر
app.get("/", (req, res) => {
  res.send("🚀 Car Wash API is running...");
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
