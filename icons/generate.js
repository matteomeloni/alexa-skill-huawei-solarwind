const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSun(ctx, cx, cy, radius, s) {
  ctx.save();
  const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  sunGrad.addColorStop(0, '#FFD54F');
  sunGrad.addColorStop(1, '#FFA726');
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = sunGrad;
  ctx.fill();

  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = Math.max(3 * s, 1.5);
  ctx.lineCap = 'round';
  const rays = 8;
  const innerR = radius * 0.65;
  const outerR = radius;
  for (let i = 0; i < rays; i++) {
    const angle = (Math.PI * 2 * i) / rays - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPanel(ctx, cx, cy, panelSize, s) {
  ctx.save();
  const pw = panelSize * 1.6;
  const ph = panelSize * 1.1;
  const px = cx - pw / 2;
  const py = cy - ph / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, px, py, pw, ph, 6 * s);
  ctx.fill();

  ctx.fillStyle = '#1565C0';
  roundRect(ctx, px + 3 * s, py + 3 * s, pw - 6 * s, ph - 6 * s, 4 * s);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = Math.max(1.5 * s, 0.8);
  const cols = 3, rows = 2;
  const cellW = (pw - 6 * s) / cols;
  const cellH = (ph - 6 * s) / rows;
  for (let i = 1; i < cols; i++) {
    const lx = px + 3 * s + i * cellW;
    ctx.beginPath(); ctx.moveTo(lx, py + 3 * s); ctx.lineTo(lx, py + ph - 3 * s); ctx.stroke();
  }
  for (let i = 1; i < rows; i++) {
    const ly = py + 3 * s + i * cellH;
    ctx.beginPath(); ctx.moveTo(px + 3 * s, ly); ctx.lineTo(px + pw - 3 * s, ly); ctx.stroke();
  }

  drawBolt(ctx, cx, py + ph + 8 * s, panelSize * 0.35, s);
  ctx.restore();
}

function drawBolt(ctx, cx, by, boltH, s) {
  const bw = boltH * 0.45;
  ctx.fillStyle = '#FFD54F';
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.1, by);
  ctx.lineTo(cx + bw * 0.5, by);
  ctx.lineTo(cx + bw * 0.1, by + boltH * 0.45);
  ctx.lineTo(cx + bw * 0.55, by + boltH * 0.45);
  ctx.lineTo(cx - bw * 0.15, by + boltH);
  ctx.lineTo(cx + bw * 0.15, by + boltH * 0.55);
  ctx.lineTo(cx - bw * 0.35, by + boltH * 0.55);
  ctx.closePath();
  ctx.fill();
}

function generateSkillIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512;

  const grad = ctx.createLinearGradient(0, size, size, 0);
  grad.addColorStop(0, '#1B3A4B');
  grad.addColorStop(1, '#4A90B8');
  roundRect(ctx, 0, 0, size, size, 80 * s);
  ctx.fillStyle = grad;
  ctx.fill();

  drawSun(ctx, size * 0.5, size * 0.30, size * 0.18, s);
  drawPanel(ctx, size * 0.5, size * 0.60, size * 0.20, s);

  ctx.font = `bold ${Math.round(44 * s)}px sans-serif`;
  ctx.fillStyle = '#FAFAFA';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PV', size * 0.5, size * 0.88);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, filename), buf);
  console.log(`  ${filename} (${size}x${size})`);
}

function generateWidgetIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512;

  const grad = ctx.createLinearGradient(0, size, size, 0);
  grad.addColorStop(0, '#1B3A4B');
  grad.addColorStop(1, '#4A90B8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  drawSun(ctx, size * 0.5, size * 0.30, size * 0.19, s);
  drawPanel(ctx, size * 0.5, size * 0.62, size * 0.22, s);

  ctx.font = `bold ${Math.round(40 * s)}px sans-serif`;
  ctx.fillStyle = '#FAFAFA';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PV', size * 0.5, size * 0.90);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, filename), buf);
  console.log(`  ${filename} (${size}x${size})`);
}

function generateWidgetPreview(filename) {
  const w = 328, h = 552;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, w * 0.3, h);
  grad.addColorStop(0, '#1B3A4B');
  grad.addColorStop(1, '#4A90B8');
  roundRect(ctx, 0, 0, w, h, 16);
  ctx.fillStyle = grad;
  ctx.fill();

  const pad = 24;

  drawSun(ctx, pad + 12, pad + 12, 12, 0.4);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#FAFAFA';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Fotovoltaico', pad + 30, pad);

  ctx.font = '600 12px sans-serif';
  ctx.fillStyle = '#B0BEC5';
  ctx.fillText('POTENZA ATTUALE', pad, 100);

  ctx.font = 'bold 54px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('3.42', pad, 124);

  const textW = ctx.measureText('3.42').width;
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('kW', pad + textW + 8, 152);

  const cardY = 240, cardH = 90;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, pad, cardY, w - pad * 2, cardH, 8);
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.font = '500 13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left';
  ctx.fillText('⚡ Oggi', pad + 14, cardY + 28);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#81C784';
  ctx.textAlign = 'right';
  ctx.fillText('8.94 kWh', w - pad - 14, cardY + 28);

  ctx.textAlign = 'left';
  ctx.font = '500 13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('📅 Mese', pad + 14, cardY + 62);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#64B5F6';
  ctx.textAlign = 'right';
  ctx.fillText('156.3 kWh', w - pad - 14, cardY + 62);

  ctx.textAlign = 'right';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('Agg. 14:30', w - pad, cardY + cardH + 16);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, filename), buf);
  console.log(`  ${filename} (${w}x${h})`);
}

console.log('Generating icons...');
generateSkillIcon(108, 'skill-icon-108.png');
generateSkillIcon(512, 'skill-icon-512.png');
generateWidgetIcon(450, 'widget-icon-450.png');
generateWidgetPreview('widget-preview-328x552.png');
console.log('Done! Files in icons/output/');
