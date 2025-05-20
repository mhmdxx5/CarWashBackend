const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /* שירותים */
    services: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name:      { type: String,  required: true },
        price:     { type: Number,  required: true },
      },
    ],

    totalPrice: { type: Number, required: true },

    /* מיקום */
    location:   { type: String,  required: true },
    coordinates:{
      lat: { type: Number },
      lng: { type: Number },
    },

    /* חשמל / מים */
    electricity: { type: Boolean, default: false },  // ✅ נקודת חשמל
    water:       { type: Boolean, default: false },  // ✅ נקודת מים

    /* תאריך-שעה */
    date:        { type: Date,   required: true },

    /* פרטים נוספים */
    carNumber:   { type: String, required: true },
    phone:       { type: String, required: true },
    notes:       { type: String },

    status: {
      type: String,
      enum: ['pending', 'completed', 'canceled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
