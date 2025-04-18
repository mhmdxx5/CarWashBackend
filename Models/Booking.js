const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  services: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: { type: String, required: true },
      price: { type: Number, required: true }
    }
  ],
  totalPrice: { type: Number, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  date: { type: Date, required: true },
  carNumber: { type: String, required: true },
  phone: { type: String },
  notes: { type: String },
  status: {
    type: String,
    enum: ["pending", "completed", "canceled"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
