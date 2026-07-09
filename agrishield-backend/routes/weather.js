const express = require('express');
const router = express.Router();
const WeatherRecord = require('../models/WeatherRecord');
const Farmer = require('../models/Farmer');
const { pollAllCounties } = require('../services/weatherPollingJob');

const RAINFALL_THRESHOLD = parseFloat(process.env.RAINFALL_THRESHOLD_MM || '20');

// GET /api/weather - latest record per county + risk level
router.get('/', async (req, res) => {
  try {
    const counties = await Farmer.distinct('county');
    const results = [];
    for (const county of counties) {
      const record = await WeatherRecord.findOne({ county }).sort({ recordDate: -1 }).lean();
      results.push({
        county,
        rainfallAmount: record ? record.rainfallAmount : null,
        threshold: RAINFALL_THRESHOLD,
        consecutiveDryDays: record ? record.consecutiveDryDays : null,
        risk: record ? (record.rainfallAmount < RAINFALL_THRESHOLD ? 'HIGH' : 'LOW') : 'UNKNOWN',
        recordDate: record ? record.recordDate : null
      });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weather/:county/history
router.get('/:county/history', async (req, res) => {
  try {
    const records = await WeatherRecord.find({ county: req.params.county })
      .sort({ recordDate: -1 })
      .limit(30)
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/weather/poll-now - manually trigger the polling job (useful for demo/judging)
router.post('/poll-now', async (req, res) => {
  try {
    await pollAllCounties();
    res.json({ success: true, message: 'Weather poll completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
