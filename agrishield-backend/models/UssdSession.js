const mongoose = require('mongoose');

// Africa's Talking sends the FULL accumulated text on every request for a session,
// so strictly we don't need server-side session state to parse input. This model
// is kept lightweight for logging/analytics of in-progress registrations only.
const UssdSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    lastText: { type: String, default: '' },
    completed: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('UssdSession', UssdSessionSchema);
