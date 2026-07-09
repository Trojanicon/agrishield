const express = require('express');
const router = express.Router();

const Farmer = require('../models/Farmer');
const Policy = require('../models/Policy');
const Payout = require('../models/Payout');
const WeatherRecord = require('../models/WeatherRecord');
const { sendSMS } = require('../services/africastalking');
const templates = require('../services/messageTemplates');

const DEFAULT_COVERAGE = 15000; // KES, flat coverage for hackathon MVP
const RAINFALL_THRESHOLD = parseFloat(process.env.RAINFALL_THRESHOLD_MM || '20');

/**
 * Very small county -> approximate coordinates lookup for the demo.
 * In production this would be a geocoding call or a dropdown of GPS-tagged locations.
 */
const COUNTY_COORDS = {
  Machakos: { lat: -1.5177, lon: 37.2634 },
  Kitui: { lat: -1.3667, lon: 38.0167 },
  Makueni: { lat: -1.8039, lon: 37.6202 },
  Kajiado: { lat: -1.8524, lon: 36.7822 },
  Turkana: { lat: 3.1167, lon: 35.6 }
};

// Fallback coords (roughly central Kenya) for counties not in the demo lookup table
const DEFAULT_COORDS = { lat: -1.2921, lon: 36.8219 };

function getCountyCoords(county) {
  const key = Object.keys(COUNTY_COORDS).find(
    (k) => k.toLowerCase() === county.trim().toLowerCase()
  );
  return key ? COUNTY_COORDS[key] : DEFAULT_COORDS;
}

/**
 * Africa's Talking POSTs: sessionId, serviceCode, phoneNumber, text
 * `text` is the FULL accumulated input, steps joined by "*".
 * e.g. user selects 1 (Register), then types name -> text = "1*Jane Wanjiku"
 *
 * Response must start with "CON " to continue the session, or "END " to close it.
 */
router.post('/', async (req, res) => {
  res.set('Content-Type', 'text/plain');

  try {
    const { phoneNumber, text = '' } = req.body;
    const level = text === '' ? [] : text.split('*');

    let response = '';

    if (text === '') {
      // Main menu
      response =
        `CON Welcome to AgriShield\n` +
        `1. Register\n` +
        `2. My Insurance Policy\n` +
        `3. Check Weather Risk\n` +
        `4. Payout History\n` +
        `5. Help`;
    } else if (level[0] === '1') {
      response = await handleRegistration(level, phoneNumber);
    } else if (level[0] === '2') {
      response = await handleMyPolicy(phoneNumber);
    } else if (level[0] === '3') {
      response = await handleWeatherRisk(phoneNumber);
    } else if (level[0] === '4') {
      response = await handlePayoutHistory(phoneNumber);
    } else if (level[0] === '5') {
      response =
        `END AgriShield gives you automatic crop insurance.\n` +
        `No paperwork. No claims. If drought is detected in your area, ` +
        `you are paid automatically by SMS.\n` +
        `Support: 0800-AGRISHIELD`;
    } else {
      response = `END Invalid option. Please dial *384*123# again.`;
    }

    res.send(response);
  } catch (err) {
    console.error('[USSD] Error:', err);
    res.send('END Sorry, AgriShield encountered an error. Please try again later.');
  }
});

/**
 * Registration flow steps (level array, 0-indexed after the leading "1"):
 * 1               -> ask full name
 * 1*Name          -> ask county
 * 1*Name*County   -> ask crop type
 * 1*Name*County*Crop        -> ask farm size
 * 1*Name*County*Crop*Size   -> save farmer + policy, send SMS, END
 */
async function handleRegistration(level, phoneNumber) {
  const existing = await Farmer.findOne({ phoneNumber });
  if (existing && level.length === 1) {
    return `END This phone number is already registered with AgriShield.\nDial *384*123# and select option 2 to view your policy.`;
  }

  if (level.length === 1) {
    return `CON Enter your full name:`;
  }
  if (level.length === 2) {
    return `CON Enter your county (e.g. Machakos):`;
  }
  if (level.length === 3) {
    return `CON Enter your crop type (e.g. Maize):`;
  }
  if (level.length === 4) {
    return `CON Enter your farm size in acres (e.g. 2):`;
  }
  if (level.length === 5) {
    const [, name, county, cropType, farmSizeRaw] = level;
    const farmSize = parseFloat(farmSizeRaw);

    if (isNaN(farmSize) || farmSize <= 0) {
      return `END Invalid farm size. Please dial *384*123# again and enter a number, e.g. 2`;
    }

    const coords = getCountyCoords(county);

    const farmer = await Farmer.create({
      name: name.trim(),
      phoneNumber,
      county: county.trim(),
      latitude: coords.lat,
      longitude: coords.lon,
      cropType: cropType.trim(),
      farmSize
    });

    await Policy.create({
      farmerId: farmer._id,
      coverageAmount: DEFAULT_COVERAGE,
      rainfallThreshold: RAINFALL_THRESHOLD,
      status: 'Active'
    });

    sendSMS(phoneNumber, templates.registration(farmer.name)).catch((e) =>
      console.error('[USSD] Registration SMS failed:', e.message)
    );

    return `END Thank you, ${farmer.name}! Your AgriShield policy is now active. A confirmation SMS is on its way.`;
  }

  return `END Registration failed. Please dial *384*123# to try again.`;
}

async function handleMyPolicy(phoneNumber) {
  const farmer = await Farmer.findOne({ phoneNumber });
  if (!farmer) {
    return `END You are not registered yet. Dial *384*123# and select option 1 to register.`;
  }
  const policy = await Policy.findOne({ farmerId: farmer._id }).sort({ created_at: -1 });
  if (!policy) {
    return `END No policy found for your account. Please register again.`;
  }
  return (
    `END Policy Summary\n` +
    `Farmer: ${farmer.name}\n` +
    `Crop: ${farmer.cropType} (${farmer.farmSize} acres)\n` +
    `Coverage: KES ${policy.coverageAmount}\n` +
    `Status: ${policy.status}`
  );
}

async function handleWeatherRisk(phoneNumber) {
  const farmer = await Farmer.findOne({ phoneNumber });
  if (!farmer) {
    return `END You are not registered yet. Dial *384*123# and select option 1 to register.`;
  }
  const record = await WeatherRecord.findOne({ county: farmer.county }).sort({ recordDate: -1 });
  if (!record) {
    return `END No weather data available yet for ${farmer.county}. Please check again later.`;
  }
  const risk = record.rainfallAmount < RAINFALL_THRESHOLD ? 'HIGH' : 'LOW';
  return (
    `END Weather Risk - ${farmer.county}\n` +
    `Rainfall (30 days): ${record.rainfallAmount.toFixed(1)}mm\n` +
    `Threshold: ${RAINFALL_THRESHOLD}mm\n` +
    `Drought Risk: ${risk}`
  );
}

async function handlePayoutHistory(phoneNumber) {
  const farmer = await Farmer.findOne({ phoneNumber });
  if (!farmer) {
    return `END You are not registered yet. Dial *384*123# and select option 1 to register.`;
  }
  const payouts = await Payout.find({ farmerId: farmer._id }).sort({ dateTriggered: -1 }).limit(3);
  if (payouts.length === 0) {
    return `END No payouts yet. You'll be notified automatically if drought is detected in ${farmer.county}.`;
  }
  const lines = payouts.map(
    (p, i) => `${i + 1}. KES ${p.amount} - ${p.status} (${p.dateTriggered.toDateString()})`
  );
  return `END Payout History\n${lines.join('\n')}`;
}

module.exports = router;
