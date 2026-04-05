const { fetchKioskResponse } = require('./services/fusionsolar/client');
const { extractRealKpi, extractPowerCurve, safeJsonParse } = require('./services/fusionsolar/payload');
const {
  validateSolarValue,
  MAX_REALTIME_POWER,
  MAX_DAILY_ENERGY,
  MAX_MONTH_ENERGY,
} = require('./services/fusionsolar/values');
const { buildChartPath } = require('./charts/powerCurveChart');
const { updateWidgetDataStore, invalidateLwaToken } = require('./services/alexaDatastore');

async function fetchSolarData() {
  const raw = await fetchKioskResponse();

  const realKpi = extractRealKpi(raw);
  if (!realKpi) {
    throw new Error('realKpi not found in API response');
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
  });

  const powerCurve = extractPowerCurve(raw);
  const chartData = buildChartPath(powerCurve, 400, 120);

  return {
    realTimePower: validateSolarValue(realKpi.realTimePower, MAX_REALTIME_POWER),
    dailyEnergy: validateSolarValue(realKpi.dailyEnergy, MAX_DAILY_ENERGY),
    monthEnergy: validateSolarValue(realKpi.monthEnergy, MAX_MONTH_ENERGY),
    lastUpdated: timeStr,
    chartData,
  };
}

module.exports = {
  fetchSolarData,
  updateWidgetDataStore,
  _testExports: {
    extractRealKpi,
    validateSolarValue,
    safeJsonParse,
    invalidateLwaToken,
    extractPowerCurve,
    buildChartPath,
  },
};
