const axios = require('axios');

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

/**
 * Fetch daily rainfall for the last `days` days for a given coordinate.
 * Open-Meteo requires no API key.
 * Returns { dailyRainfall: number[], dates: string[], totalRainfall: number, consecutiveDryDays: number }
 */
async function fetchRainfallHistory(latitude, longitude, days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const fmt = (d) => d.toISOString().split('T')[0];

  const params = {
    latitude,
    longitude,
    start_date: fmt(start),
    end_date: fmt(end),
    daily: 'precipitation_sum',
    timezone: 'auto'
  };

  const { data } = await axios.get(ARCHIVE_URL, { params, timeout: 10000 });

  const dailyRainfall = (data.daily && data.daily.precipitation_sum) || [];
  const dates = (data.daily && data.daily.time) || [];

  const totalRainfall = dailyRainfall.reduce((sum, v) => sum + (v || 0), 0);

  // Count consecutive dry days (rainfall < 1mm counts as "dry") from the most recent day backward
  let consecutiveDryDays = 0;
  for (let i = dailyRainfall.length - 1; i >= 0; i--) {
    if ((dailyRainfall[i] || 0) < 1) {
      consecutiveDryDays++;
    } else {
      break;
    }
  }

  return { dailyRainfall, dates, totalRainfall, consecutiveDryDays };
}

/**
 * Fetch current/short-term forecast rainfall (fallback if archive API is unavailable
 * or for near-real-time checks).
 */
async function fetchCurrentRainfall(latitude, longitude) {
  const params = {
    latitude,
    longitude,
    daily: 'precipitation_sum',
    past_days: 30,
    forecast_days: 1,
    timezone: 'auto'
  };

  const { data } = await axios.get(BASE_URL, { params, timeout: 10000 });
  const dailyRainfall = (data.daily && data.daily.precipitation_sum) || [];
  const totalRainfall = dailyRainfall.reduce((sum, v) => sum + (v || 0), 0);

  let consecutiveDryDays = 0;
  for (let i = dailyRainfall.length - 1; i >= 0; i--) {
    if ((dailyRainfall[i] || 0) < 1) {
      consecutiveDryDays++;
    } else {
      break;
    }
  }

  return { dailyRainfall, totalRainfall, consecutiveDryDays };
}

module.exports = { fetchRainfallHistory, fetchCurrentRainfall };
