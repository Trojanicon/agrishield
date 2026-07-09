const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const Policy = require('../models/Policy');

// GET /api/farmers - list all farmers with their latest policy status
router.get('/', async (req, res) => {
  try {
    const farmers = await Farmer.find({}).sort({ created_at: -1 }).lean();
    const farmerIds = farmers.map((f) => f._id);
    const policies = await Policy.find({ farmerId: { $in: farmerIds } }).lean();

    const policyByFarmer = new Map();
    for (const p of policies) {
      policyByFarmer.set(String(p.farmerId), p);
    }

    const result = farmers.map((f) => ({
      ...f,
      policy: policyByFarmer.get(String(f._id)) || null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmers/:id
router.get('/:id', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id).lean();
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
    const policy = await Policy.findOne({ farmerId: farmer._id }).lean();
    res.json({ ...farmer, policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmers - manual registration (admin/dashboard convenience, or non-USSD channel)
router.post('/', async (req, res) => {
  try {
    const { name, phoneNumber, county, latitude, longitude, cropType, farmSize } = req.body;
    if (!name || !phoneNumber || !county || !cropType || !farmSize) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const farmer = await Farmer.create({
      name,
      phoneNumber,
      county,
      latitude: latitude || -1.2921,
      longitude: longitude || 36.8219,
      cropType,
      farmSize
    });
    const policy = await Policy.create({
      farmerId: farmer._id,
      coverageAmount: 15000,
      rainfallThreshold: parseFloat(process.env.RAINFALL_THRESHOLD_MM || '20'),
      status: 'Active'
    });
    res.status(201).json({ farmer, policy });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
