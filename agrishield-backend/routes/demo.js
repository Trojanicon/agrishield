const express = require('express');
const router = express.Router();

const Farmer = require('../models/Farmer');
const Policy = require('../models/Policy');
const Payout = require('../models/Payout');
const WeatherRecord = require('../models/WeatherRecord');
const { evaluateCounty } = require('../services/droughtEngine');

const RAINFALL_THRESHOLD = parseFloat(process.env.RAINFALL_THRESHOLD_MM || '20');
const DROUGHT_WINDOW_DAYS = parseInt(process.env.DROUGHT_WINDOW_DAYS || '30', 10);

/**
 * POST /api/demo/simulate-drought
 * Body: { county: "Machakos" }  (optional - defaults to the first county with an active policy)
 *
 * This is the single button the frontend "SIMULATE DROUGHT" control calls.
 * It performs all 5 steps required by the judging demo, synchronously, in one request:
 *   1. Reduce rainfall value below threshold
 *   2. Trigger drought engine
 *   3. Generate payout
 *   4. Send SMS notification
 *   5. Return updated dashboard data
 */
router.post('/simulate-drought', async (req, res) => {
  try {
    let { county } = req.body;

    if (!county) {
      const anyPolicy = await Policy.findOne({ status: 'Active' }).populate('farmerId');
      if (!anyPolicy) {
        return res.status(400).json({ error: 'No active policies to simulate a drought for. Register a farmer first.' });
      }
      county = anyPolicy.farmerId.county;
    }

    const sampleFarmer = await Farmer.findOne({ county });
    if (!sampleFarmer) {
      return res.status(404).json({ error: `No farmers registered in ${county}` });
    }

    // Step 1: reduce rainfall value below threshold and mark this record as simulated
    const simulatedRainfall = Math.max(0, RAINFALL_THRESHOLD - 8); // comfortably below threshold
    const weatherRecord = await WeatherRecord.create({
      county,
      latitude: sampleFarmer.latitude,
      longitude: sampleFarmer.longitude,
      rainfallAmount: simulatedRainfall,
      consecutiveDryDays: DROUGHT_WINDOW_DAYS,
      recordDate: new Date(),
      source: 'simulation',
      simulated: true
    });

    // Steps 2-4: drought engine trigger + payout creation + SMS notification
    const payouts = await evaluateCounty(county);

    res.json({
      success: true,
      county,
      weatherRecord,
      payoutsTriggered: payouts.length,
      payouts
    });
  } catch (err) {
    console.error('[Demo] simulate-drought failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/demo/overview
 * Powers the dashboard's top overview cards.
 */
router.get('/overview', async (req, res) => {
  try {
    const [totalFarmers, activePolicies, triggeredPolicies, payouts] = await Promise.all([
      Farmer.countDocuments({}),
      Policy.countDocuments({ status: 'Active' }),
      Policy.countDocuments({ status: { $in: ['Triggered', 'Paid'] } }),
      Payout.find({})
    ]);

    const totalCompensationPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      totalFarmers,
      activePolicies,
      policiesTriggered: triggeredPolicies,
      totalCompensationPaid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/demo/reset
 * Resets simulated data so the demo can be re-run cleanly during judging.
 * Only removes simulated weather records and resets Triggered policies back to Active.
 * Does NOT delete real farmers/policies.
 */
router.post('/reset', async (req, res) => {
  try {
    await WeatherRecord.deleteMany({ simulated: true });
    await Policy.updateMany({ status: 'Triggered' }, { $set: { status: 'Active' } });
    await Payout.deleteMany({});
    res.json({ success: true, message: 'Demo state reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
