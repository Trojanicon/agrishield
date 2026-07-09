const express = require('express');
const router = express.Router();
const { sendSMS } = require('../services/africastalking');

/**
 * Africa's Talking delivery report webhook.
 * Configure this URL in the AT dashboard as the "Delivery Reports" callback.
 */
router.post('/delivery-report', (req, res) => {
  console.log('[SMS] Delivery report:', req.body);
  res.sendStatus(200);
});

/**
 * Africa's Talking inbound SMS webhook (if farmers text AgriShield directly).
 * Configure this as the "Incoming Messages" callback.
 */
router.post('/inbound', (req, res) => {
  console.log('[SMS] Inbound message:', req.body);
  // Future: parse commands like "STATUS" or "HELP" texted in by farmers
  res.sendStatus(200);
});

/**
 * Manual test-send endpoint, useful for judging/demo without going through USSD.
 * POST { "to": "+2547XXXXXXXX", "message": "..." }
 */
router.post('/send-test', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'to and message are required' });
  }
  try {
    const result = await sendSMS(to, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
