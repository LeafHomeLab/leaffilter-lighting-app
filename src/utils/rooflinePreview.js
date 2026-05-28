// Shared roofline canvas preview — used by both the pattern card list and the editor.
// Normalized [x, y] points forming a 2-peak house silhouette (x=0 left, y=0 top).
export const ROOF_PTS = [
  [0.03, 0.82],  // left base
  [0.28, 0.10],  // left peak  (main roof — taller)
  [0.50, 0.50],  // center valley
  [0.71, 0.20],  // right peak (garage / addition — shorter)
  [0.97, 0.63],  // right base
];

export function buildRooflineDots(W, H, spacing) {
  const sp = spacing ?? (W > 280 ? 9 : 7.5);
  const dots = [];
  for (let seg = 0; seg < ROOF_PTS.length - 1; seg++) {
    const x1 = ROOF_PTS[seg][0] * W,     y1 = ROOF_PTS[seg][1] * H;
    const x2 = ROOF_PTS[seg + 1][0] * W, y2 = ROOF_PTS[seg + 1][1] * H;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const count = Math.max(2, Math.round(len / sp));
    for (let d = 0; d < count; d++) {
      const t = d / count;
      dots.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    }
  }
  dots.push([ROOF_PTS[ROOF_PTS.length - 1][0] * W, ROOF_PTS[ROOF_PTS.length - 1][1] * H]);
  return dots;
}

export function getDotColorIdx(scene, dotIdx, offset) {
  const n = scene.colors.length;
  const rev = (scene.direction ?? 'forward') === 'reverse';
  const d = rev ? -1 : 1;
  switch (scene.animation) {
    case 'Static':   return dotIdx % n;
    case 'Gradient': return dotIdx % n;
    case 'Fade':
    case 'Pulse':    return Math.floor(offset / 6) % n;
    case 'Bounce': {
      const period = 2 * n;
      const pos = offset % period;
      const eff = pos < n ? pos : period - pos;
      return ((d * dotIdx + eff) % n + n) % n;
    }
    default:         return ((d * dotIdx + offset) % n + n) % n;
  }
}

export function getDotAlpha(animation, dotIdx, offset) {
  switch (animation) {
    case 'Twinkle':
    case 'Sparkle': return 0.25 + (Math.sin(dotIdx * 2.9 + offset * 1.3) * 0.5 + 0.5) * 0.75;
    case 'Pulse':   return 0.35 + (Math.sin(offset * 0.35) * 0.5 + 0.5) * 0.65;
    case 'Fade':    return 0.40 + (Math.sin(offset * 0.25 + dotIdx * 0.15) * 0.5 + 0.5) * 0.60;
    default:        return 1;
  }
}

export function drawHouseSilhouette(ctx, W, H) {
  ctx.beginPath();
  ctx.moveTo(ROOF_PTS[0][0] * W, H);
  for (const [nx, ny] of ROOF_PTS) ctx.lineTo(nx * W, ny * H);
  ctx.lineTo(ROOF_PTS[ROOF_PTS.length - 1][0] * W, H);
  ctx.closePath();
  ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(ROOF_PTS[0][0] * W, ROOF_PTS[0][1] * H);
  for (let i = 1; i < ROOF_PTS.length; i++) ctx.lineTo(ROOF_PTS[i][0] * W, ROOF_PTS[i][1] * H);
  ctx.strokeStyle = 'rgba(60, 60, 60, 0.55)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

export function startRooflinePreview(canvas, scene) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const dots = buildRooflineDots(W, H);
  const dotR = W > 280 ? 3.5 : 2.8;
  const isStatic = scene.animation === 'Static' || !scene.speed;
  const msPerStep = isStatic ? Infinity : Math.round(900 / Math.max(scene.speed, 1));
  let offset = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawHouseSilhouette(ctx, W, H);
    dots.forEach(([x, y], i) => {
      const colorIdx = getDotColorIdx(scene, i, offset);
      const color = scene.colors[colorIdx];
      const alpha = getDotAlpha(scene.animation, i, offset);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
  }

  draw();
  if (isStatic) return () => {};
  const timerId = setInterval(() => { offset++; draw(); }, msPerStep);
  return () => clearInterval(timerId);
}
