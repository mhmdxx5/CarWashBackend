const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const verifySid = process.env.TWILIO_VERIFY_SERVICE;

// שליחת OTP דרך Twilio Verify
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });

  try {
    const verification = await client.verify.v2.services(verifySid)
      .verifications
      .create({
        to: phone.startsWith('+') ? phone : `+972${phone.slice(1)}`,
        channel: 'sms'
      });

    res.json({ success: true, sid: verification.sid });
  } catch (err) {
    console.error('OTP send error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// אימות OTP דרך Twilio Verify
router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ success: false, message: 'Phone and code are required' });

  try {
    const verificationCheck = await client.verify.v2.services(verifySid)
      .verificationChecks
      .create({
        to: phone.startsWith('+') ? phone : `+972${phone.slice(1)}`,
        code
      });

    if (verificationCheck.status === 'approved') {
      res.json({ success: true, message: 'OTP verified' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid or expired code' });
    }
  } catch (err) {
    console.error('OTP verify error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

module.exports = router;
