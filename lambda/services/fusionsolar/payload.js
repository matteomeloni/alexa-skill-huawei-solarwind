function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
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

  const inner = parsed.data ? (typeof parsed.data === 'string' ? safeJsonParse(parsed.data) : parsed.data) : parsed;

  return inner || null;
}

function extractRealKpi(raw) {
  const payload = decodeKioskPayload(raw);
  return payload?.realKpi || null;
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

module.exports = { safeJsonParse, decodeKioskPayload, extractRealKpi, extractPowerCurve };
