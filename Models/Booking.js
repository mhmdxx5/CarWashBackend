const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user       : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required:true },

  /* שירותים */
  services:[{
    productId: { type: mongoose.Schema.Types.ObjectId, ref:'Product' },
    name     : { type:String,  required:true },
    price    : { type:Number,  required:true },
  }],

  /* תוספת אופציונלית לשטיפה בבית */
  homeExtraPrice: { type:Number, default:0 },   // ‎₪20 אם “غسيل في المنزل”

  totalPrice: { type:Number, required:true },

  /* מיקום */
  location   : { type:String,  required:true },
  coordinates:{ lat:Number, lng:Number },

  /* חשמל / מים (רק בשטיפה בבית) */
  electricity: { type:Boolean, default:false },
  water      : { type:Boolean, default:false },

  /* תאריך-שעה */
  date       : { type:Date,    required:true },

  /* מידע נוסף */
  carNumber  : { type:String, required:true },  // לוחית רישוי
  carCode    : { type:String },                 // 🔑 קוד-מפתח (חדש)
  notes      : { type:String },                 // הערות כתובת / כללי

  /* סוג השירות */
  serviceMode:{
    type   : String,
    enum   : ['home', 'pickup'],                // home=“غسيل في المنزل”, pickup=“مندوب…”
    default: 'home',
  },

  status:{
    type   : String,
    enum   : ['pending','completed','canceled'],
    default: 'pending',
  },
},{ timestamps:true });

module.exports = mongoose.model('Booking', bookingSchema);
