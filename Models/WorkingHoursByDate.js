const mongoose = require('mongoose');

const workingHoursByDateSchema = new mongoose.Schema({
  date: {               // 'YYYY-MM-DD'
    type: String,
    required: true,
    unique: true,
  },
  hours: [String],      // ['08:00', '09:00', ...]
});

module.exports = mongoose.model(
  'WorkingHoursByDate',
  workingHoursByDateSchema
);
