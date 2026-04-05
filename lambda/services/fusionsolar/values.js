const MAX_REALTIME_POWER = 100;
const MAX_DAILY_ENERGY = 500;
const MAX_MONTH_ENERGY = 15000;

function validateSolarValue(value, max) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > max) return '0';
  return String(num);
}

module.exports = { validateSolarValue, MAX_REALTIME_POWER, MAX_DAILY_ENERGY, MAX_MONTH_ENERGY };
