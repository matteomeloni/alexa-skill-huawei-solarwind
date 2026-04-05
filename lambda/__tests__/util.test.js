const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { _testExports } = require('../util');
const { extractRealKpi, validateSolarValue, safeJsonParse, extractPowerCurve, buildChartPath } = _testExports;

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    assert.deepEqual(safeJsonParse('{"a":1}'), { a: 1 });
  });

  it('returns null for invalid JSON', () => {
    assert.equal(safeJsonParse('not json'), null);
    assert.equal(safeJsonParse(''), null);
  });
});

describe('validateSolarValue', () => {
  it('accepts valid values within range', () => {
    assert.equal(validateSolarValue('3.42', 100), '3.42');
    assert.equal(validateSolarValue('0', 100), '0');
    assert.equal(validateSolarValue(99, 100), '99');
  });

  it('rejects negative values', () => {
    assert.equal(validateSolarValue('-5', 100), '0');
  });

  it('rejects values exceeding max', () => {
    assert.equal(validateSolarValue('200', 100), '0');
  });

  it('rejects non-numeric values', () => {
    assert.equal(validateSolarValue('--', 100), '0');
    assert.equal(validateSolarValue('N/A', 100), '0');
    assert.equal(validateSolarValue(null, 100), '0');
    assert.equal(validateSolarValue(undefined, 100), '0');
  });
});

describe('extractRealKpi', () => {
  const kpiData = { realTimePower: 3.42, dailyEnergy: 8.5, monthEnergy: 150 };

  it('extracts from direct object with realKpi at top level', () => {
    const result = extractRealKpi({ realKpi: kpiData });
    assert.deepEqual(result, kpiData);
  });

  it('extracts from nested data object', () => {
    const result = extractRealKpi({ data: { realKpi: kpiData } });
    assert.deepEqual(result, kpiData);
  });

  it('extracts from stringified data', () => {
    const raw = JSON.stringify({ data: { realKpi: kpiData } });
    const result = extractRealKpi(raw);
    assert.deepEqual(result, kpiData);
  });

  it('extracts from HTML-encoded string in data field', () => {
    const inner = JSON.stringify({ realKpi: kpiData });
    const encoded = inner.replace(/"/g, '&quot;');
    const result = extractRealKpi({ data: encoded });
    assert.deepEqual(result, kpiData);
  });

  it('extracts from double-nested string data', () => {
    const innerStr = JSON.stringify({ realKpi: kpiData });
    const result = extractRealKpi({ data: innerStr });
    assert.deepEqual(result, kpiData);
  });

  it('returns null for invalid input', () => {
    assert.equal(extractRealKpi('not json'), null);
    assert.equal(extractRealKpi(null), null);
    assert.equal(extractRealKpi({}), null);
  });

  it('returns null when realKpi is missing', () => {
    assert.equal(extractRealKpi({ data: { other: 123 } }), null);
  });
});

describe('extractPowerCurve', () => {
  it('extracts valid power curve data', () => {
    const raw = {
      powerCurve: {
        xAxis: ['08:00', '08:05', '08:10'],
        activePower: ['0.5', '1.2', '2.0'],
      },
      realKpi: {},
    };
    const result = extractPowerCurve(raw);
    assert.deepEqual(result, [
      { time: '08:00', power: 0.5 },
      { time: '08:05', power: 1.2 },
      { time: '08:10', power: 2 },
    ]);
  });

  it('filters out dash values (future timestamps)', () => {
    const raw = {
      powerCurve: {
        xAxis: ['08:00', '08:05', '08:10'],
        activePower: ['1.0', '-', '-'],
      },
      realKpi: {},
    };
    const result = extractPowerCurve(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].power, 1);
  });

  it('returns null when no powerCurve in payload', () => {
    assert.equal(extractPowerCurve({ realKpi: {} }), null);
  });

  it('returns null when all values are dashes', () => {
    const raw = {
      powerCurve: {
        xAxis: ['00:00', '00:05'],
        activePower: ['-', '-'],
      },
      realKpi: {},
    };
    assert.equal(extractPowerCurve(raw), null);
  });

  it('returns null for invalid input', () => {
    assert.equal(extractPowerCurve(null), null);
    assert.equal(extractPowerCurve('not json'), null);
  });

  it('decodes HTML-encoded kiosk payload with powerCurve', () => {
    const inner = JSON.stringify({
      powerCurve: { xAxis: ['10:00'], activePower: ['3.5'] },
      realKpi: {},
    });
    const encoded = inner.replace(/"/g, '&quot;');
    const result = extractPowerCurve({ data: encoded });
    assert.deepEqual(result, [{ time: '10:00', power: 3.5 }]);
  });
});

describe('buildChartPath', () => {
  it('generates SVG paths from power curve points', () => {
    const points = [
      { time: '08:00', power: 0 },
      { time: '09:00', power: 2 },
      { time: '10:00', power: 1 },
    ];
    const result = buildChartPath(points, 400, 120);

    assert.ok(result);
    assert.ok(result.areaPath.startsWith('M'));
    assert.ok(result.areaPath.endsWith('Z'));
    assert.ok(result.linePath.startsWith('M'));
    assert.equal(result.width, 400);
    assert.equal(result.height, 120);
    assert.equal(result.peakPower, 2);
    assert.equal(result.peakTime, '09:00');
    assert.ok(result.yScale >= 2);
  });

  it('returns null for empty points', () => {
    assert.equal(buildChartPath([], 400, 120), null);
    assert.equal(buildChartPath(null, 400, 120), null);
  });

  it('returns null when all values are zero', () => {
    const points = [
      { time: '08:00', power: 0 },
      { time: '09:00', power: 0 },
    ];
    assert.equal(buildChartPath(points, 400, 120), null);
  });

  it('filters out points before 08:00 and after 20:00', () => {
    const points = [
      { time: '05:00', power: 0.1 },
      { time: '08:00', power: 1 },
      { time: '12:00', power: 3 },
      { time: '21:00', power: 0.1 },
    ];
    const result = buildChartPath(points, 400, 120);
    assert.ok(result);
    assert.equal(result.peakPower, 3);
    assert.equal(result.peakTime, '12:00');
  });

  it('generates xLabels at 2-hour intervals from 08 to 20', () => {
    const points = [];
    for (let h = 8; h <= 20; h++) {
      points.push({ time: `${String(h).padStart(2, '0')}:00`, power: h - 7 });
    }
    const result = buildChartPath(points, 400, 120);
    assert.ok(result.xLabels.length > 0);
    assert.ok(result.xLabels.some((l) => l.text === '08:00'));
    assert.ok(result.xLabels.some((l) => l.text === '12:00'));
    assert.ok(result.xLabels.some((l) => l.text === '20:00'));
  });

  it('generates yLabels for the vertical axis', () => {
    const points = [
      { time: '10:00', power: 1 },
      { time: '12:00', power: 2.3 },
      { time: '14:00', power: 0.5 },
    ];
    const result = buildChartPath(points, 400, 120);
    assert.ok(result.yLabels.length >= 2);
    assert.ok(parseFloat(result.yLabels[0].text) > 0);
    assert.equal(result.yLabels[0].y, 0);
  });
});
