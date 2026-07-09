/**
 * Wraps Africa's Talking SMS sending.
 * If MOCK_AFRICAS_TALKING=true (or no API key set), messages are logged to
 * console instead of hitting the live API. This keeps the hackathon demo
 * working even without provisioned sandbox credentials.
 */

const MOCK = process.env.MOCK_AFRICAS_TALKING === 'true' || !process.env.AT_API_KEY;

let sms = null;

if (!MOCK) {
  const AfricasTalking = require('africastalking')({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME || 'sandbox'
  });
  sms = AfricasTalking.SMS;
} else {
  console.warn('[AfricasTalking] MOCK MODE enabled — SMS will be logged, not sent.');
}

/**
 * Send an SMS to one or more recipients.
 * @param {string|string[]} to - phone number(s) in E.164 format e.g. +2547XXXXXXXX
 * @param {string} message
 */
async function sendSMS(to, message) {
  const recipients = Array.isArray(to) ? to : [to];

  if (MOCK) {
    console.log('----- [MOCK SMS] -----');
    console.log('To:', recipients.join(', '));
    console.log('Message:', message);
    console.log('-----------------------');
    return { status: 'mocked', recipients, message };
  }

  try {
    const result = await sms.send({
      to: recipients,
      message,
      from: process.env.AT_SENDER_ID || undefined
    });
    return result;
  } catch (err) {
    console.error('[AfricasTalking] SMS send failed:', err.message);
    throw err;
  }
}

module.exports = { sendSMS, MOCK };
