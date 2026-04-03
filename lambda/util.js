const axios = require('axios');

const KIOSK_URL = 'https://uni005eu5.fusionsolar.huawei.com/rest/pvms/web/kiosk/v1/station-kiosk-file';
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

  tokenPromise = requestLwaToken();
  return tokenPromise;
}

async function requestLwaToken() {
  const clientId = process.env.SKILL_CLIENT_ID;
  const clientSecret = process.env.SKILL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SKILL_CLIENT_ID / SKILL_CLIENT_SECRET not set');
  }

  console.log('Requesting LWA token');
  const response = await axios.post(LWA_TOKEN_URL, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'alexa::datastore',
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 5000,
  });

  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
  console.log('LWA token obtained, TTL:', response.data.expires_in);
  return response.data.access_token;
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function extractRealKpi(raw) {
  let parsed;

  if (typeof raw === 'string') {
    parsed = safeJsonParse(raw);
  } else if (raw && typeof raw.data === 'string') {
    const decoded = raw.data
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");
    parsed = safeJsonParse(decoded);
  } else {
    parsed = raw;
  }

  if (!parsed) return null;

  const inner = parsed.data
    ? (typeof parsed.data === 'string' ? safeJsonParse(parsed.data) : parsed.data)
    : parsed;

  return inner?.realKpi || null;
}

function validateSolarValue(value, max) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > max) return '0';
  return String(num);
}

async function fetchSolarData() {
  const token = process.env.KIOSK_TOKEN;
  if (!token) {
    throw new Error('KIOSK_TOKEN environment variable not set');
  }

  const response = await axios.get(KIOSK_URL, {
    params: { kk: token },
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AlexaSkill-Fotovoltaico/1.0',
    },
    timeout: 8000,
  });

  const realKpi = extractRealKpi(response.data);
  if (!realKpi) {
    throw new Error('realKpi not found in API response');
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    realTimePower: validateSolarValue(realKpi.realTimePower, 100),
    dailyEnergy: validateSolarValue(realKpi.dailyEnergy, 500),
    monthEnergy: validateSolarValue(realKpi.monthEnergy, 15000),
    lastUpdated: timeStr,
  };
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
        'Authorization': `Bearer ${lwaToken}`,
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

module.exports = {
  fetchSolarData,
  updateWidgetDataStore,
  _testExports: { extractRealKpi, validateSolarValue, safeJsonParse, invalidateLwaToken },
};
