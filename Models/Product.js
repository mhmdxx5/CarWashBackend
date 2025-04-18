const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true }, // اسم الخدمة
  description: { type: String }, // وصف الخدمة (اختياري)
  price: { type: Number, required: true }, // سعر الخدمة
  duration: { type: Number }, // مدة تنفيذ الخدمة (بالدقائق)
  type: { 
    type: String, 
    enum: ["external", "internal", "polish", "other"], 
    default: "other" 
  } // نوع الخدمة (خارجي، داخلي، بوليش، غيره)
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
