const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { _testExports } = require('../util');
const { extractRealKpi, validateSolarValue, safeJsonParse } = _testExports;

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
