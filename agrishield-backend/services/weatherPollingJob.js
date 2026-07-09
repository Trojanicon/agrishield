const cron = require('node-cron');
const Farmer = require('../models/Farmer');
const WeatherRecord = require('../models/WeatherRecord');
const { fetchRainfallHistory } = require('./weatherService');
const { evaluateCounty } = require('./droughtEngine');
const { sendSMS } = require('./africastalking');
const templates = require('./messageTemplates');

const RAINFALL_THRESHOLD = parseFloat(process.env.RAINFALL_THRESHOLD_MM || '20');

/**
 * For every distinct county with registered farmers, fetch rainfall from Open-Meteo
 * using one representative farmer's coordinates, store a WeatherRecord, warn farmers
 * if rainfall is trending low, then run the drought engine to trigger payouts.
 */
async function pollAllCounties() {
  const farmers = await Farmer.find({});
  if (farmers.length === 0) {
    console.log('[WeatherJob] No farmers registered yet, skipping poll.');
    return;
  }

  const countyMap = new Map(); // county -> representative farmer (first found)
  for (const f of farmers) {
    if (!countyMap.has(f.county)) countyMap.set(f.county, f);
  }

  for (const [county, farmer] of countyMap.entries()) {
    try {
      const { totalRainfall, consecutiveDryDays } = await fetchRainfallHistory(
        farmer.latitude,
        farmer.longitude,
        30
      );

      const record = await WeatherRecord.create({
        county,
        latitude: farmer.latitude,
        longitude: farmer.longitude,
        rainfallAmount: totalRainfall,
        consecutiveDryDays,
        recordDate: new Date(),
        source: 'open-meteo'
      });

      console.log(`[WeatherJob] ${county}: ${totalRainfall.toFixed(1)}mm / ${consecutiveDryDays} dry days`);

      // Early warning: rainfall trending toward threshold but not yet triggering
      if (totalRainfall < RAINFALL_THRESHOLD * 1.5) {
        const countyFarmers = farmers.filter((f) => f.county === county);
        for (const cf of countyFarmers) {
          sendSMS(cf.phoneNumber, templates.weatherWarning(county)).catch(() => {});
        }
      }

      await evaluateCounty(county);
    } catch (err) {
      console.error(`[WeatherJob] Failed to poll ${county}:`, err.message);
    }
  }
}

function startWeatherPolling() {
  const cronExpr = process.env.WEATHER_POLL_CRON || '0 */6 * * *';
  console.log(`[WeatherJob] Scheduled with cron "${cronExpr}"`);
  cron.schedule(cronExpr, () => {
    pollAllCounties().catch((err) => console.error('[WeatherJob] Poll run failed:', err));
  });
}

module.exports = { startWeatherPolling, pollAllCounties };
