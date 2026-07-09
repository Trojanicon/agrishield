require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Farmer = require('../models/Farmer');
const Policy = require('../models/Policy');

const DEMO_FARMERS = [
  {
    name: 'Jane Wanjiku',
    phoneNumber: '+254711111111',
    county: 'Machakos',
    latitude: -1.5177,
    longitude: 37.2634,
    cropType: 'Maize',
    farmSize: 2
  },
  {
    name: 'Peter Mutua',
    phoneNumber: '+254722222222',
    county: 'Machakos',
    latitude: -1.5177,
    longitude: 37.2634,
    cropType: 'Beans',
    farmSize: 1.5
  },
  {
    name: 'Grace Nduku',
    phoneNumber: '+254733333333',
    county: 'Kitui',
    latitude: -1.3667,
    longitude: 38.0167,
    cropType: 'Sorghum',
    farmSize: 3
  }
];

async function seed() {
  await connectDB();

  for (const data of DEMO_FARMERS) {
    const existing = await Farmer.findOne({ phoneNumber: data.phoneNumber });
    if (existing) {
      console.log(`[Seed] Skipping ${data.name}, already exists`);
      continue;
    }
    const farmer = await Farmer.create(data);
    await Policy.create({
      farmerId: farmer._id,
      coverageAmount: 15000,
      rainfallThreshold: parseFloat(process.env.RAINFALL_THRESHOLD_MM || '20'),
      status: 'Active'
    });
    console.log(`[Seed] Created ${data.name} in ${data.county}`);
  }

  console.log('[Seed] Done.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
