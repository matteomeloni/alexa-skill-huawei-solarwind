const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const MOCK_SOLAR_DATA = {
  realTimePower: '3.42',
  dailyEnergy: '8.5',
  monthEnergy: '150',
  lastUpdated: '14:30',
  chartData: null,
};

function createMockHandlerInput(requestType, intentName, opts = {}) {
  const { aplSupported = false } = opts;
  const responses = [];

  return {
    requestEnvelope: {
      request: {
        type: requestType,
        ...(intentName ? { intent: { name: intentName } } : {}),
        ...(requestType === 'SessionEndedRequest' ? { reason: 'USER_INITIATED' } : {}),
      },
      context: {
        System: {
          user: { userId: 'amzn1.ask.account.TESTUSER' },
          device: {
            supportedInterfaces: aplSupported ? { 'Alexa.Presentation.APL': {} } : {},
          },
        },
      },
    },
    responseBuilder: {
      speak(text) {
        responses.push({ speak: text });
        return this;
      },
      reprompt(text) {
        responses.push({ reprompt: text });
        return this;
      },
      withShouldEndSession(val) {
        responses.push({ endSession: val });
        return this;
      },
      addDirective(d) {
        responses.push({ directive: d });
        return this;
      },
      getResponse() {
        return { responses };
      },
    },
    _responses: responses,
  };
}

describe('handler: exports.handler routing', () => {
  it('routes EventBridge scheduled events', async () => {
    process.env.ALEXA_USER_ID = 'test-user';
    process.env.KIOSK_TOKEN = 'test-token';

    const mockAxios = {
      get: mock.fn(async () => ({
        data: { realKpi: { realTimePower: 1, dailyEnergy: 2, monthEnergy: 3 } },
      })),
      post: mock.fn(async () => ({ status: 200, data: {} })),
    };

    const originalRequire = module.constructor.prototype.require;
    const axiosMod = require('axios');
    mock.method(axiosMod, 'get', mockAxios.get);
    mock.method(axiosMod, 'post', mockAxios.post);

    process.env.SKILL_CLIENT_ID = 'test-id';
    process.env.SKILL_CLIENT_SECRET = 'test-secret';

    const { _testExports } = require('../util');
    _testExports.invalidateLwaToken();

    mock.method(axiosMod, 'post', async (url) => {
      if (url.includes('amazon.com')) {
        return { data: { access_token: 'mock-token', expires_in: 3600 } };
      }
      return { status: 200, data: {} };
    });

    const { handler } = require('../index');

    const result = await handler({ source: 'aws.events', 'detail-type': 'Scheduled Event' }, {});
    assert.equal(result.statusCode, 200);

    delete process.env.ALEXA_USER_ID;
    delete process.env.KIOSK_TOKEN;
    delete process.env.SKILL_CLIENT_ID;
    delete process.env.SKILL_CLIENT_SECRET;
  });

  it('returns 400 when ALEXA_USER_ID is missing for scheduled event', async () => {
    delete process.env.ALEXA_USER_ID;

    const { handler } = require('../index');
    const result = await handler({ source: 'aws.events', 'detail-type': 'Scheduled Event' }, {});
    assert.equal(result.statusCode, 400);
  });
});

describe('messages integration', () => {
  it('messages module exports all required keys', () => {
    const msg = require('../messages');
    const requiredKeys = [
      'WELCOME_PRODUCING',
      'WELCOME_NOT_PRODUCING',
      'WELCOME_FALLBACK',
      'REPROMPT_DEFAULT',
      'POWER_PRODUCING',
      'POWER_NOT_PRODUCING',
      'REPROMPT_MORE',
      'DAILY_ENERGY',
      'HELP',
      'HELP_REPROMPT',
      'GOODBYE',
      'FALLBACK',
      'FALLBACK_REPROMPT',
      'ERROR_FETCH',
      'ERROR_RETRY_REPROMPT',
      'ERROR_GENERIC',
    ];
    for (const key of requiredKeys) {
      assert.ok(msg[key] !== undefined, `Missing message key: ${key}`);
    }
  });

  it('template functions produce strings', () => {
    const msg = require('../messages');
    assert.equal(typeof msg.WELCOME_PRODUCING(3.42, 8.5), 'string');
    assert.equal(typeof msg.WELCOME_NOT_PRODUCING(8.5), 'string');
    assert.equal(typeof msg.POWER_PRODUCING(3.42), 'string');
    assert.equal(typeof msg.DAILY_ENERGY(8.5), 'string');
  });
});
