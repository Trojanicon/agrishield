const express = require('express');
const router = express.Router();
const Payout = require('../models/Payout');

// GET /api/payouts - list all payouts with farmer + policy detail
router.get('/', async (req, res) => {
  try {
    const payouts = await Payout.find({})
      .sort({ dateTriggered: -1 })
      .populate('farmerId', 'name phoneNumber county')
      .populate('policyId', 'coverageAmount rainfallThreshold status')
      .lean();
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payouts/summary - totals for the dashboard overview cards
router.get('/summary', async (req, res) => {
  try {
    const payouts = await Payout.find({});
    const totalCompensationPaid = payouts.reduce((sum, p) => sum + p.amount, 0);
    res.json({
      totalPayouts: payouts.length,
      totalCompensationPaid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
