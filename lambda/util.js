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
  const payload = decodeKioskPayload(raw);
  return payload?.realKpi || null;
}

function validateSolarValue(value, max) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > max) return '0';
  return String(num);
}

function decodeKioskPayload(raw) {
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

  return inner || null;
}

function extractPowerCurve(raw) {
  const payload = decodeKioskPayload(raw);
  if (!payload?.powerCurve) return null;

  const { xAxis, activePower } = payload.powerCurve;
  if (!Array.isArray(xAxis) || !Array.isArray(activePower)) return null;

  const points = [];
  for (let i = 0; i < xAxis.length; i++) {
    const val = parseFloat(activePower[i]);
    if (!isNaN(val) && activePower[i] !== '-') {
      points.push({ time: xAxis[i], power: val });
    }
  }
  return points.length > 0 ? points : null;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const CHART_START = 8 * 60;
const CHART_END = 20 * 60;

function buildChartPath(points, width, height) {
  if (!points || points.length === 0) return null;

  const filtered = points.filter(p => {
    const m = timeToMinutes(p.time);
    return m >= CHART_START && m <= CHART_END;
  });

  const yMax = Math.max(...filtered.map(p => p.power));
  if (yMax <= 0) return null;

  const yScale = 4;
  const totalMinutes = CHART_END - CHART_START;

  const coords = filtered.map(p => ({
    x: Math.round(((timeToMinutes(p.time) - CHART_START) / totalMinutes) * width * 100) / 100,
    y: Math.round((1 - p.power / yScale) * height * 100) / 100,
  }));

  if (coords.length === 0) return null;

  const linePath = coords.map((c, i) =>
    `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`
  ).join(' ');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  const xLabels = [];
  for (let h = 8; h <= 20; h += 2) {
    const label = `${String(h).padStart(2, '0')}:00`;
    const x = Math.round(((h * 60 - CHART_START) / totalMinutes) * width * 100) / 100;
    xLabels.push({ text: label, x });
  }

  const yLabels = [];
  const yStep = yScale <= 2 ? 0.5 : yScale <= 5 ? 1 : 2;
  for (let v = yScale; v >= 0; v -= yStep) {
    const y = Math.round((1 - v / yScale) * height * 100) / 100;
    yLabels.push({ text: String(v), y });
  }
  const yAxisText = yLabels.map(l => l.text).join('<br/>');

  let peakPower = 0;
  let peakTime = '';
  for (const p of filtered) {
    if (p.power > peakPower) {
      peakPower = p.power;
      peakTime = p.time;
    }
  }

  return { areaPath, linePath, xLabels, yLabels, yAxisText, yScale, peakPower, peakTime, width, height };
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

  const powerCurve = extractPowerCurve(response.data);
  const chartData = buildChartPath(powerCurve, 400, 120);

  return {
    realTimePower: validateSolarValue(realKpi.realTimePower, 100),
    dailyEnergy: validateSolarValue(realKpi.dailyEnergy, 500),
    monthEnergy: validateSolarValue(realKpi.monthEnergy, 15000),
    lastUpdated: timeStr,
    chartData,
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
          chartData: solarData.chartData ? {
            areaPath: solarData.chartData.areaPath,
            linePath: solarData.chartData.linePath,
            xLabels: solarData.chartData.xLabels,
            yLabels: solarData.chartData.yLabels,
            yAxisText: solarData.chartData.yAxisText,
          } : null,
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
  _testExports: { extractRealKpi, validateSolarValue, safeJsonParse, invalidateLwaToken, extractPowerCurve, buildChartPath },
};
