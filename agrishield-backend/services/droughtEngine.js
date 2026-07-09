const Policy = require('../models/Policy');
const Farmer = require('../models/Farmer');
const Payout = require('../models/Payout');
const WeatherRecord = require('../models/WeatherRecord');
const { sendSMS } = require('./africastalking');
const templates = require('./messageTemplates');

const DROUGHT_WINDOW_DAYS = parseInt(process.env.DROUGHT_WINDOW_DAYS || '30', 10);

/**
 * Core rule: IF rainfall < threshold FOR N consecutive days THEN trigger payout.
 * Evaluated against the latest WeatherRecord for the farmer's county.
 */
function isDroughtConditionMet(weatherRecord, rainfallThreshold) {
  if (!weatherRecord) return false;
  const belowThreshold = weatherRecord.rainfallAmount < rainfallThreshold;
  const longEnoughDry = weatherRecord.consecutiveDryDays >= DROUGHT_WINDOW_DAYS;
  return belowThreshold && longEnoughDry;
}

/**
 * Calculate a simple proportional compensation:
 * The lower the rainfall relative to threshold, the higher the payout, capped at coverageAmount.
 */
function calculateCompensation(policy, weatherRecord) {
  const deficitRatio = Math.min(
    1,
    Math.max(0, (policy.rainfallThreshold - weatherRecord.rainfallAmount) / policy.rainfallThreshold)
  );
  // Minimum 50% payout once triggered, scaling up to 100% for severe deficits
  const payoutRatio = 0.5 + 0.5 * deficitRatio;
  return Math.round(policy.coverageAmount * payoutRatio);
}

/**
 * Evaluate all Active policies for a given county against its latest weather record,
 * trigger payouts where conditions are met, and send SMS notifications.
 * Returns an array of created Payout documents.
 */
async function evaluateCounty(county) {
  const latestRecord = await WeatherRecord.findOne({ county }).sort({ recordDate: -1 });
  if (!latestRecord) return [];

  const policies = await Policy.find({ status: 'Active' }).populate('farmerId');
  const countyPolicies = policies.filter(
    (p) => p.farmerId && p.farmerId.county.toLowerCase() === county.toLowerCase()
  );

  const createdPayouts = [];

  for (const policy of countyPolicies) {
    if (!isDroughtConditionMet(latestRecord, policy.rainfallThreshold)) continue;

    const amount = calculateCompensation(policy, latestRecord);
    const reason = `Rainfall ${latestRecord.rainfallAmount}mm < ${policy.rainfallThreshold}mm threshold for ${latestRecord.consecutiveDryDays} consecutive dry days`;

    policy.status = 'Triggered';
    await policy.save();

    const payout = await Payout.create({
      policyId: policy._id,
      farmerId: policy.farmerId._id,
      amount,
      status: 'Approved',
      triggerReason: reason,
      dateTriggered: new Date()
    });

    try {
      await sendSMS(policy.farmerId.phoneNumber, templates.payoutTrigger(amount));
      payout.notificationStatus = 'Sent';
    } catch (err) {
      payout.notificationStatus = 'Failed';
    }
    await payout.save();

    createdPayouts.push(payout);
  }

  return createdPayouts;
}

module.exports = { isDroughtConditionMet, calculateCompensation, evaluateCounty, DROUGHT_WINDOW_DAYS };
