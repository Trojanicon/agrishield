require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const { startWeatherPolling } = require('./services/weatherPollingJob');

const ussdRoutes = require('./routes/ussd');
const smsRoutes = require('./routes/sms');
const farmerRoutes = require('./routes/farmers');
const weatherRoutes = require('./routes/weather');
const payoutRoutes = require('./routes/payouts');
const demoRoutes = require('./routes/demo');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Africa's Talking posts form-encoded data

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'AgriShield backend' }));

// USSD entry point (configure this as your Africa's Talking USSD callback URL)
app.use('/ussd', ussdRoutes);

// SMS webhooks + test-send
app.use('/sms', smsRoutes);

// Admin dashboard REST API (consumed by Developer 2's React frontend)
app.use('/api/farmers', farmerRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/demo', demoRoutes);

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  startWeatherPolling();
  app.listen(PORT, () => {
    console.log(`[Server] AgriShield backend running on port ${PORT}`);
    console.log(`[Server] USSD callback: http://localhost:${PORT}/ussd`);
    console.log(`[Server] Dashboard API base: http://localhost:${PORT}/api`);
  });
}

start();
