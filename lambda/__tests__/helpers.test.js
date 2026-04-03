const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { supportsAPL, safeNumber } = require('../helpers');

describe('safeNumber', () => {
  it('parses valid numbers', () => {
    assert.equal(safeNumber('3.42'), 3.42);
    assert.equal(safeNumber('0'), 0);
    assert.equal(safeNumber('100.5'), 100.5);
  });

  it('returns fallback for NaN inputs', () => {
    assert.equal(safeNumber('--'), 0);
    assert.equal(safeNumber('N/A'), 0);
    assert.equal(safeNumber(''), 0);
    assert.equal(safeNumber(null), 0);
    assert.equal(safeNumber(undefined), 0);
  });

  it('uses custom fallback', () => {
    assert.equal(safeNumber('bad', -1), -1);
  });
});

describe('supportsAPL', () => {
  it('returns true when APL is supported', () => {
    const handlerInput = {
      requestEnvelope: {
        context: {
          System: {
            device: {
              supportedInterfaces: { 'Alexa.Presentation.APL': {} },
            },
          },
        },
      },
    };
    assert.ok(supportsAPL(handlerInput));
  });

  it('returns falsy when device has no APL', () => {
    const handlerInput = {
      requestEnvelope: {
        context: {
          System: {
            device: {
              supportedInterfaces: {},
            },
          },
        },
      },
    };
    assert.ok(!supportsAPL(handlerInput));
  });

  it('returns falsy when device is undefined', () => {
    const handlerInput = {
      requestEnvelope: {
        context: {
          System: {},
        },
      },
    };
    assert.ok(!supportsAPL(handlerInput));
  });
});
