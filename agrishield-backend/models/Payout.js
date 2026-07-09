const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema(
  {
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Notified', 'Failed'],
      default: 'Pending'
    },
    triggerReason: { type: String }, // e.g. "Rainfall 12mm < 20mm threshold for 30 days"
    dateTriggered: { type: Date, default: Date.now },
    notificationStatus: { type: String, enum: ['Not Sent', 'Sent', 'Failed'], default: 'Not Sent' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Payout', PayoutSchema);
