const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    coverageAmount: { type: Number, required: true }, // KES
    rainfallThreshold: { type: Number, required: true, default: 20 }, // mm
    status: {
      type: String,
      enum: ['Active', 'Triggered', 'Paid', 'Lapsed'],
      default: 'Active'
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Policy', PolicySchema);
