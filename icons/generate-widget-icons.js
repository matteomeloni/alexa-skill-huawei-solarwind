const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const SIZE = 64;
const COLOR = '#FAFAFA';

function createIcon(filename, drawFn) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawFn(ctx, SIZE);
  fs.writeFileSync(path.join(outDir, filename), canvas.toBuffer('image/png'));
  console.log(`  ${filename} (${SIZE}x${SIZE})`);
}

function drawPowerIcon(ctx, s) {
  const cx = s / 2, cy = s / 2;
  const u = s * 0.22;
  ctx.fillStyle = COLOR;
  ctx.beginPath();
  ctx.moveTo(cx + u * 0.1, cy - u * 1.8);
  ctx.lineTo(cx - u * 0.9, cy + u * 0.1);
  ctx.lineTo(cx - u * 0.05, cy + u * 0.1);
  ctx.lineTo(cx - u * 0.1, cy + u * 1.8);
  ctx.lineTo(cx + u * 0.9, cy - u * 0.1);
  ctx.lineTo(cx + u * 0.05, cy - u * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawSunIcon(ctx, s) {
  const cx = s / 2, cy = s / 2;
  const r = s * 0.15;
  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const rays = 8;
  const inner = r + 5;
  const outer = r + 11;
  for (let i = 0; i < rays; i++) {
    const angle = (Math.PI * 2 * i) / rays;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }
}

function drawCalendarIcon(ctx, s) {
  const cx = s / 2, cy = s / 2;
  const w = s * 0.55, h = s * 0.5;
  const x = cx - w / 2, y = cy - h / 2 + 3;
  const cr = 3;

  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x + cr, y);
  ctx.lineTo(x + w - cr, y);
  ctx.arcTo(x + w, y, x + w, y + cr, cr);
  ctx.lineTo(x + w, y + h - cr);
  ctx.arcTo(x + w, y + h, x + w - cr, y + h, cr);
  ctx.lineTo(x + cr, y + h);
  ctx.arcTo(x, y + h, x, y + h - cr, cr);
  ctx.lineTo(x, y + cr);
  ctx.arcTo(x, y, x + cr, y, cr);
  ctx.closePath();
  ctx.stroke();

  const lineY = y + h * 0.32;
  ctx.beginPath();
  ctx.moveTo(x, lineY);
  ctx.lineTo(x + w, lineY);
  ctx.stroke();

  const tabH = 5;
  for (const tx of [x + w * 0.3, x + w * 0.7]) {
    ctx.beginPath();
    ctx.moveTo(tx, y - tabH);
    ctx.lineTo(tx, y + 3);
    ctx.stroke();
  }

  const dotR = 2;
  const dotSpacingX = w * 0.25;
  const dotSpacingY = h * 0.2;
  const startY = lineY + h * 0.22;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.beginPath();
      ctx.arc(
        x + w * 0.25 + col * dotSpacingX,
        startY + row * dotSpacingY,
        dotR, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }
}

console.log('Generating monowhite widget icons...');
createIcon('icon-power.png', drawPowerIcon);
createIcon('icon-today.png', drawSunIcon);
createIcon('icon-month.png', drawCalendarIcon);
console.log('Done!');
