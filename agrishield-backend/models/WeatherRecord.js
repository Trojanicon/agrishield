const mongoose = require('mongoose');

const WeatherRecordSchema = new mongoose.Schema(
  {
    county: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    rainfallAmount: { type: Number, required: true }, // mm (rolling window total, e.g. last 30 days)
    recordDate: { type: Date, required: true, default: Date.now },
    consecutiveDryDays: { type: Number, default: 0 },
    source: { type: String, default: 'open-meteo' },
    simulated: { type: Boolean, default: false } // true when created by SIMULATE DROUGHT demo button
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

WeatherRecordSchema.index({ county: 1, recordDate: -1 });

module.exports = mongoose.model('WeatherRecord', WeatherRecordSchema);
