const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

describe('services/fusionsolar/payload', () => {
  const { safeJsonParse, extractRealKpi, extractPowerCurve } = require('../services/fusionsolar/payload');

  it('safeJsonParse handles valid and invalid input', () => {
    assert.deepEqual(safeJsonParse('{"a":1}'), { a: 1 });
    assert.equal(safeJsonParse('bad'), null);
  });

  it('extractRealKpi works from nested payload', () => {
    const kpi = { realTimePower: 2.5, dailyEnergy: 5, monthEnergy: 100 };
    assert.deepEqual(extractRealKpi({ data: { realKpi: kpi } }), kpi);
    assert.equal(extractRealKpi(null), null);
  });

  it('extractPowerCurve filters dash values', () => {
    const raw = {
      powerCurve: { xAxis: ['08:00', '09:00'], activePower: ['1.5', '-'] },
      realKpi: {},
    };
    const result = extractPowerCurve(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].power, 1.5);
    assert.equal(result[0].time, '08:00');
  });
});

describe('services/fusionsolar/values', () => {
  const {
    validateSolarValue,
    MAX_REALTIME_POWER,
    MAX_DAILY_ENERGY,
    MAX_MONTH_ENERGY,
  } = require('../services/fusionsolar/values');

  it('exports named constants', () => {
    assert.equal(MAX_REALTIME_POWER, 100);
    assert.equal(MAX_DAILY_ENERGY, 500);
    assert.equal(MAX_MONTH_ENERGY, 15000);
  });

  it('validates within range', () => {
    assert.equal(validateSolarValue('3.5', 100), '3.5');
    assert.equal(validateSolarValue('200', 100), '0');
  });
});

describe('charts/powerCurveChart', () => {
  const { timeToMinutes, buildChartPath } = require('../charts/powerCurveChart');

  it('timeToMinutes handles valid input', () => {
    assert.equal(timeToMinutes('08:30'), 510);
    assert.equal(timeToMinutes('12:00'), 720);
  });

  it('timeToMinutes returns NaN for invalid input', () => {
    assert.ok(isNaN(timeToMinutes(null)));
    assert.ok(isNaN(timeToMinutes(123)));
    assert.ok(isNaN(timeToMinutes('no-colon')));
  });

  it('buildChartPath filters invalid time entries', () => {
    const points = [
      { time: '10:00', power: 2 },
      { time: null, power: 1 },
      { time: 123, power: 1 },
    ];
    const result = buildChartPath(points, 400, 120);
    assert.ok(result);
    assert.equal(result.peakPower, 2);
  });
});

describe('services/alexaDatastore - LWA cache fix', () => {
  it('clears cached token on LWA request failure', async () => {
    process.env.SKILL_CLIENT_ID = 'test-id';
    process.env.SKILL_CLIENT_SECRET = 'test-secret';

    const axiosMod = require('axios');
    let callCount = 0;

    mock.method(axiosMod, 'post', async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('LWA network error');
      }
      return { data: { access_token: 'recovered-token', expires_in: 3600 } };
    });

    const { getLwaToken, invalidateLwaToken } = require('../services/alexaDatastore');
    invalidateLwaToken();

    await assert.rejects(() => getLwaToken(), { message: 'LWA network error' });

    const token = await getLwaToken();
    assert.equal(token, 'recovered-token');
    assert.equal(callCount, 2);

    invalidateLwaToken();
    delete process.env.SKILL_CLIENT_ID;
    delete process.env.SKILL_CLIENT_SECRET;
  });
});
