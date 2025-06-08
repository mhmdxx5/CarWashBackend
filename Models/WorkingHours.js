// models/WorkingHours.js
const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true,
    unique: true,
  },
  hours: [String], // לדוגמה ['08:00', '09:00', '10:00']
});

module.exports = mongoose.model('WorkingHours', workingHoursSchema);
