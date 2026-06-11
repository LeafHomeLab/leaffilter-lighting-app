// Shared roofline canvas preview — used by both the pattern card list and the editor.
// Each animation is modeled on the actual WLED effect it maps to (see WLED_EFFECT_MAP
// in api.js), verified against the controller by sampling /json/live:
//   Static/Alternating → Solid Pattern Tri (84): repeating colors, no motion
//   Chase              → Chase (28): col0+col2 runners on col1 background
//   Wave               → Chase 3 (54): three marching color bands
//   Fade               → Tri Fade (56): whole strip cross-fades through colors
//   Twinkle            → Twinklefox (80, pal 5): fixed-color dots twinkling on dark
//   Sparkle            → Glitter (87, pal 5): moving color bands + white flashes
//   Meteor             → Meteor (76, pal 5): bright head, decaying trail
//   Pulse              → Breathe (2): blends col0 ↔ col1, breathing
//   Bounce             → Rolling Balls (48): one ball per color on dark background
//   Gradient           → Palette (65, pal 4): smooth moving color gradient

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

// ── Color helpers ────────────────────────────────────────────────────────────

function hexChannels(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

function blendHex(hexA, hexB, t) {
  const a = hexChannels(hexA);
  const b = hexChannels(hexB);
  const mix = a.map((c, i) => Math.round(c + (b[i] - c) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

// ── Per-dot rendering ────────────────────────────────────────────────────────

/**
 * Computes the rendered color + alpha for one roofline dot, mirroring the WLED
 * effect this animation maps to on hardware.
 *
 * @param {{ colors: string[], animation: string, direction?: string }} scene
 * @param {number} dotIdx - Index of the dot along the roofline
 * @param {number} offset - Animation tick counter
 * @param {number} total  - Total dot count
 * @returns {{ color: string, alpha: number }}
 */
export function getDotRender(scene, dotIdx, offset, total) {
  const colors = scene.colors;
  const n = colors.length;
  const rev = (scene.direction ?? 'forward') === 'reverse';
  const d = rev ? -1 : 1;
  const mod = (v, m) => ((v % m) + m) % m;

  switch (scene.animation) {
    // Solid Pattern Tri: repeating colors, no movement (hardware ignores speed)
    case 'Static':
    case 'Alternating':
      return { color: colors[dotIdx % n], alpha: 1 };

    // Chase: col0 + col2 runner pair sweeping over a col1 background
    case 'Chase': {
      const pos = mod(dotIdx - d * offset, 6);
      if (pos === 0) return { color: colors[0], alpha: 1 };
      if (pos === 1) return { color: colors[2] ?? colors[0], alpha: 1 };
      return { color: colors[1] ?? '#000000', alpha: n > 1 ? 1 : 0.08 };
    }

    // Chase 3: equal bands of every color marching along the strip
    case 'Wave': {
      const band = Math.floor(dotIdx / 3);
      return { color: colors[mod(d * band + offset, n)], alpha: 1 };
    }

    // Tri Fade: the whole strip cross-fades from one color to the next
    case 'Fade': {
      const phase = offset / 8;
      const from = colors[Math.floor(phase) % n];
      const to   = colors[(Math.floor(phase) + 1) % n];
      return { color: blendHex(from, to, phase - Math.floor(phase)), alpha: 1 };
    }

    // Breathe: blends between col0 and col1 (or dims toward dark with one color)
    case 'Pulse': {
      const t = (Math.sin(offset * 0.35) + 1) / 2;
      const bg = colors[1] ?? '#000000';
      return { color: blendHex(colors[0], bg, t * 0.85), alpha: 1 };
    }

    // Twinklefox: each dot keeps a fixed palette color and twinkles on dark
    case 'Twinkle': {
      const color = colors[(dotIdx * 7 + 3) % n];
      const a = Math.sin(dotIdx * 2.9 + offset * 1.3) * 0.5 + 0.5;
      return { color, alpha: a < 0.45 ? 0.05 : a };
    }

    // Glitter: marching color bands with random white sparkle flashes on top
    case 'Sparkle': {
      if (mod(dotIdx * 31 + offset * 17, 19) === 0) return { color: '#FFFFFF', alpha: 1 };
      const band = Math.floor(dotIdx / 3);
      return { color: colors[mod(d * band + offset, n)], alpha: 1 };
    }

    // Meteor: bright head with a decaying trail over banded palette colors
    case 'Meteor': {
      const head = rev ? total - 1 - mod(offset * 2, total) : mod(offset * 2, total);
      const dist = mod(d * (head - dotIdx), total);
      const color = colors[Math.floor(dotIdx / 3) % n];
      return { color, alpha: Math.max(0.05, 1 - dist / 10) };
    }

    // Rolling Balls: one ball per color rolling back and forth on a dark strip
    case 'Bounce': {
      for (let k = 0; k < Math.min(n, 3); k++) {
        const pos = ((total - 1) / 2) * (1 + Math.sin(offset * 0.18 * (1 + k * 0.35) + k * 2.1));
        if (Math.abs(dotIdx - pos) < 1.3) return { color: colors[k], alpha: 1 };
      }
      return { color: colors[0], alpha: 0.05 };
    }

    // Palette (Color Gradient): smooth gradient through all colors, drifting
    case 'Gradient': {
      const t = mod((dotIdx + d * offset) / 6, n);
      const i0 = Math.floor(t) % n;
      return { color: blendHex(colors[i0], colors[(i0 + 1) % n], t - Math.floor(t)), alpha: 1 };
    }

    // Unknown animation — marching single-dot stripes (legacy behavior)
    default:
      return { color: colors[mod(d * dotIdx + offset, n)], alpha: 1 };
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
  // Alternating maps to a static hardware effect (Solid Pattern Tri) — never animate it
  const isStatic = scene.animation === 'Static' || scene.animation === 'Alternating' || !scene.speed;
  const msPerStep = isStatic ? Infinity : Math.round(900 / Math.max(scene.speed, 1));
  let offset = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawHouseSilhouette(ctx, W, H);
    dots.forEach(([x, y], i) => {
      const { color, alpha } = getDotRender(scene, i, offset, dots.length);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = alpha > 0.3 ? 9 : 0;
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
