module.exports = {
  registration: (name) =>
    `Welcome to AgriShield, ${name}. Your crop insurance policy is now active.`,

  weatherWarning: (county) =>
    `AgriShield Alert: Low rainfall has been detected in ${county}. Your crop protection remains active.`,

  payoutTrigger: (amount) =>
    `AgriShield: Drought conditions have been confirmed. Your insurance compensation of KES ${amount} has been approved.`,

  payoutPaid: (amount) =>
    `AgriShield: Your compensation of KES ${amount} has been disbursed. Thank you for trusting AgriShield.`
};
