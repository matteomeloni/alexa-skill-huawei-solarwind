const CHART_START = 8 * 60;
const CHART_END = 20 * 60;

function timeToMinutes(t) {
  if (typeof t !== 'string' || !t.includes(':')) return NaN;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function buildChartPath(points, width, height) {
  if (!points || points.length === 0) return null;

  const filtered = points.filter((p) => {
    const m = timeToMinutes(p.time);
    return !isNaN(m) && m >= CHART_START && m <= CHART_END;
  });

  const yMax = Math.max(...filtered.map((p) => p.power));
  if (yMax <= 0) return null;

  const yScale = 4;
  const totalMinutes = CHART_END - CHART_START;

  const coords = filtered.map((p) => ({
    x: Math.round(((timeToMinutes(p.time) - CHART_START) / totalMinutes) * width * 100) / 100,
    y: Math.round((1 - p.power / yScale) * height * 100) / 100,
  }));

  if (coords.length === 0) return null;

  const curvePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  const linePath = `M 0 ${height} ${curvePath} M ${width} ${height}`;

  const areaPath = `M 0 ${height} ${curvePath} L ${coords[coords.length - 1].x} ${height} L 0 ${height} Z`;

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
  const yAxisText = yLabels.map((l) => l.text).join('<br/>');

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

module.exports = { timeToMinutes, buildChartPath, CHART_START, CHART_END };
