const axios = require('axios');

const KIOSK_URL = 'https://uni005eu5.fusionsolar.huawei.com/rest/pvms/web/kiosk/v1/station-kiosk-file';
const DATASTORE_API = 'https://api.eu.amazonalexa.com/v1/datastore/commands';
const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

let cachedLwaToken = null;
let tokenExpiresAt = 0;

async function getLwaToken() {
  if (cachedLwaToken && Date.now() < tokenExpiresAt) {
    console.log('Using cached LWA token');
    return cachedLwaToken;
  }

  const clientId = process.env.SKILL_CLIENT_ID;
  const clientSecret = process.env.SKILL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SKILL_CLIENT_ID / SKILL_CLIENT_SECRET not set');
  }

  console.log('Requesting new LWA token...');
  const response = await axios.post(LWA_TOKEN_URL, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'alexa::datastore',
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 5000,
  });

  cachedLwaToken = response.data.access_token;
  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
  console.log('LWA token obtained, expires_in:', response.data.expires_in);
  return cachedLwaToken;
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

  const raw = response.data;
  let parsed;

  if (typeof raw === 'string') {
    parsed = JSON.parse(raw);
  } else if (raw && typeof raw.data === 'string') {
    const decoded = raw.data
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");
    parsed = JSON.parse(decoded);
  } else {
    parsed = raw;
  }

  const realKpi = parsed.data
    ? (typeof parsed.data === 'string' ? JSON.parse(parsed.data) : parsed.data).realKpi
    : parsed.realKpi;

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
    realTimePower: String(realKpi.realTimePower ?? '0'),
    dailyEnergy: String(realKpi.dailyEnergy ?? '0'),
    monthEnergy: String(realKpi.monthEnergy ?? '0'),
    yearEnergy: String(realKpi.yearEnergy ?? '0'),
    lastUpdated: timeStr,
  };
}

async function updateWidgetDataStore(userId, solarData) {
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

  console.log('DataStore PUT_OBJECT payload:', JSON.stringify(payload));

  try {
    const resp = await axios.post(DATASTORE_API, payload, {
      headers: {
        'Authorization': `Bearer ${lwaToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    console.log('DataStore response status:', resp.status, 'data:', JSON.stringify(resp.data));
  } catch (err) {
    if (err.response) {
      console.error('DataStore error status:', err.response.status, 'body:', JSON.stringify(err.response.data));
    }
    throw err;
  }
}

module.exports = { fetchSolarData, updateWidgetDataStore };
