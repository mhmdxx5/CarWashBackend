const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dt3mmadat',    // תחליף לשם שלך ב־Cloudinary
  api_key: '363231651115672', // תחליף למפתח שלך
  api_secret: 'zBmDmxEplFzt6RLvwoY8kVE3BiQ',       // תחליף לסיקרט שלך
});

module.exports = cloudinary;
