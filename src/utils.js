// Shared utilities — imported by screens that need them.
// Nothing here should import from any screen file.

export const PATTERN_COLOR_LIGHTNESS = 55; // HSL L value used for all stored pattern colors

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Converts a 0–100 white-temperature percentage to a hex color.
// 0 = warm orange (#FF9329), 50 = pure white, 100 = cool blue (#7EB3FF).
export function whiteTempToColor(pct) {
  const stops = [
    [0,   0xFF, 0x93, 0x29],
    [25,  0xFF, 0xD4, 0xA3],
    [50,  0xFF, 0xFF, 0xFF],
    [75,  0xC8, 0xD8, 0xFF],
    [100, 0x7E, 0xB3, 0xFF],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i][0] && pct <= stops[i + 1][0]) {
      lo = stops[i]; hi = stops[i + 1]; break;
    }
  }
  const t = (pct - lo[0]) / (hi[0] - lo[0] || 1);
  const rv = Math.round(lo[1] + t * (hi[1] - lo[1]));
  const gv = Math.round(lo[2] + t * (hi[2] - lo[2]));
  const bv = Math.round(lo[3] + t * (hi[3] - lo[3]));
  return '#' + [rv, gv, bv].map(c => c.toString(16).padStart(2, '0')).join('');
}

export function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.getElementById('app-frame').appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Updates the center FAB button to reflect the current light color.
export function syncFabColor(hex) {
  const fab = document.getElementById('nav-control');
  if (!fab || !hex) return;
  const normalized = hex.startsWith('#') ? hex : '#' + hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const glow = `rgba(${r},${g},${b},0.5)`;
  fab.style.setProperty('--fab-color', normalized);
  fab.style.setProperty('--fab-glow', glow);
  // Set background directly — CSS-variable-only updates are unreliable without @property
  fab.style.background = normalized;
  fab.style.boxShadow = `0 0 0 2px var(--bg-primary), 0 0 20px ${glow}, 0 6px 20px rgba(0,0,0,0.5)`;
}
