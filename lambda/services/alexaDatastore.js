const axios = require('axios');

const DATASTORE_API = 'https://api.eu.amazonalexa.com/v1/datastore/commands';
const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

let tokenPromise = null;
let tokenExpiresAt = 0;

function invalidateLwaToken() {
  tokenPromise = null;
  tokenExpiresAt = 0;
}

async function getLwaToken() {
  if (tokenPromise && Date.now() < tokenExpiresAt) {
    return tokenPromise;
  }

  tokenPromise = requestLwaToken().catch((err) => {
    tokenPromise = null;
    tokenExpiresAt = 0;
    throw err;
  });

  return tokenPromise;
}

async function requestLwaToken() {
  const clientId = process.env.SKILL_CLIENT_ID;
  const clientSecret = process.env.SKILL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SKILL_CLIENT_ID / SKILL_CLIENT_SECRET not set');
  }

  console.log('Requesting LWA token');
  const response = await axios.post(
    LWA_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'alexa::datastore',
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    },
  );

  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
  console.log('LWA token obtained, TTL:', response.data.expires_in);
  return response.data.access_token;
}

async function updateWidgetDataStore(userId, solarData, _retried = false) {
  const lwaToken = await getLwaToken();

  const payload = {
    commands: [
      {
        type: 'PUT_OBJECT',
        namespace: 'fotovoltaico',
        key: 'realtime',
        content: {
          realTimePower: solarData.realTimePower,
          dailyEnergy: solarData.dailyEnergy,
          monthEnergy: solarData.monthEnergy,
          lastUpdated: solarData.lastUpdated,
          chartData: solarData.chartData
            ? {
                areaPath: solarData.chartData.areaPath,
                linePath: solarData.chartData.linePath,
                xLabels: solarData.chartData.xLabels,
                yLabels: solarData.chartData.yLabels,
                yAxisText: solarData.chartData.yAxisText,
              }
            : null,
        },
      },
    ],
    target: {
      type: 'USER',
      id: userId,
    },
  };

  try {
    const resp = await axios.post(DATASTORE_API, payload, {
      headers: {
        Authorization: `Bearer ${lwaToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    console.log('DataStore response:', resp.status);
  } catch (err) {
    const status = err.response?.status;
    if ((status === 401 || status === 403) && !_retried) {
      console.log('Token rejected, refreshing and retrying');
      invalidateLwaToken();
      return updateWidgetDataStore(userId, solarData, true);
    }
    console.error('DataStore error:', status, err.message);
    throw err;
  }
}

module.exports = { getLwaToken, invalidateLwaToken, updateWidgetDataStore };
