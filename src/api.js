// ─── LeafFilter Lighting → WLED Hardware Bridge ─────────────────────────────
//
// Translates UI state (colors, zones, brightness, movements) into WLED JSON API
// calls. The app runs fully in "demo mode" when hardware is unreachable — all
// calls resolve gracefully and the UI continues to function normally.
//
// Target: ESP32 running WLED firmware, local WiFi only (cloud relay: future).
// API reference: https://kno.wled.ge/interfaces/json-api/
//
// ─── FUTURE (v2) ────────────────────────────────────────────────────────────
//  • Per-zone patterns: let customer toggle between zones on the home screen
//    and assign a different color/effect to each zone independently.
//    API already supports this via setPattern({ zones: state.allZones.filter(z => z.active) })
//  • Multi-controller: customer has 2+ hubs (e.g. house + outbuilding).
//    Each hub is a separate WLED instance; use createController() to register.
//  • Cloud relay: remote access via AWS IoT / MQTT when off home WiFi.
//  • OTA firmware updates: push new WLED builds from the app.
//
// ─── CONFIRMED PRODUCT DECISIONS ────────────────────────────────────────────
//  • RGBW/CCT pucks — supplier uses a 5-channel addressable system (RGB + dual-
//    channel Warm White/Cool White).
//  • Pucks ARE individually addressable (using SM16825 or similar 5-channel
//    driver ICs). The Tuya CBU module is only on the controller board, NOT inside
//    the pucks.
//  • 36V operation (matches supplier's Mean Well LPV-100-36 36V PSU).
//    Voltage is transparent to the app/API layer.
//  • LeafFilter owns the controller (ESP32-based running WLED firmware) and
//    the app. No Tuya dependency.
//  • Max 4 zones per controller. Most homes use 1–2.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Configuration ────────────────────────────────────────────────────────────

/** True once connect() succeeds. Guards live hardware calls. */
export let HARDWARE_CONNECTED = false;

let HUB_IP = localStorage.getItem('leaflight_hub_ip') || '';
const TIMEOUT_MS = 3000; // Prevent UI hangs when hub is offline

// ─── Lookup Tables ─────────────────────────────────────────────────────────────

/**
 * Maps app movement names → WLED effect fx IDs.
 * Reference: https://kno.wled.ge/features/effects/
 *
 * Verified against WLED 0.14.0 on the Dig-Quad by sampling /json/live with
 * red/white/blue segment colors: effects below render the actual segment
 * colors (pal:0 forces color-slot effects to use them; palette-only effects
 * need pal 5 "Colors Only" / pal 4 "Color Gradient" — see WLED_PALETTE_MAP).
 */
export const WLED_EFFECT_MAP = {
  Stationary:  0,   // Solid — uses col[0] (multi-color → 84, see effectForMovement)
  Static:      0,   // Solid (alias)
  Chase:       28,  // Chase — col[0]+col[2] runners on col[1] bg ✓
  Twinkle:     80,  // Twinklefox — palette-only; pal 5 renders segment colors ✓
  Sparkle:     87,  // Glitter — 3-color base (pal 5) + white sparkles ✓
  Wave:        54,  // Chase 3 — 3-color sweep ✓
  Fade:        56,  // Tri Fade — 3-color fade ✓
  Meteor:      76,  // Meteor — palette-only; pal 5 renders segment colors ✓
  Pulse:       2,   // Breathe — blends col[0] ↔ col[1]
  Bounce:      48,  // Rolling Balls — up to 3 ball colors on dark bg ✓
  Gradient:    65,  // Palette — pal 4 = smooth moving gradient of segment colors ✓
  Alternating: 84,  // Solid Pattern Tri — 3-color static ✓
};

/**
 * Palette overrides for palette-driven effects. Everything else uses pal 0,
 * which makes WLED's color-slot effects read the segment colors directly.
 * pal 5 = "Colors Only" (distinct bands from col 1/2/3), pal 4 = "Color Gradient".
 */
export const WLED_PALETTE_MAP = {
  Twinkle:  5,
  Sparkle:  5,
  Meteor:   5,
  Gradient: 4,
};

/**
 * Resolves a movement name + color count to the WLED { fx, pal } pair.
 * Multi-color static patterns need Solid Pattern Tri (84) — plain Solid (0)
 * only ever shows col[0]. Palette-driven effects with a single color use
 * pal 2 ("Color 1") so the palette is built from that color alone.
 *
 * @param {string} movement   - App movement name, e.g. 'Chase'
 * @param {number} colorCount - Number of colors being sent
 * @returns {{ fx: number, pal: number }}
 */
export function effectForMovement(movement, colorCount = 1) {
  if ((movement === 'Stationary' || movement === 'Static') && colorCount > 1) {
    return { fx: 84, pal: 0 };
  }
  let pal = WLED_PALETTE_MAP[movement] ?? 0;
  if (pal !== 0 && colorCount === 1) pal = 2;
  return { fx: WLED_EFFECT_MAP[movement] ?? 0, pal };
}

/**
 * Maximum zones per controller. Each zone = one GPIO output = one wire run.
 * The QuinLED Dig-Quad has 4 outputs; most homes use 1–2.
 */
export const MAX_ZONES_PER_CONTROLLER = 4;

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a bare controller object. Zones are added after the installer completes
 * the wiring survey and calls configureZones on the returned object.
 *
 * @param {string} id  - Stable unique ID, e.g. 'ctrl-garage'
 * @param {string} ip  - e.g. '192.168.1.43'
 * @returns {{ id: string, name: string, ip: string, zones: [] }}
 */
export function createController(id, ip) {
  return { id, name: id, ip, zones: [] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a hex color string to an [R, G, B] array.
 * @param {string} hex - e.g. '#FF6347' or 'FF6347'
 * @returns {number[]}
 */
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/**
 * Pads an RGB color list to exactly 3 entries so stale colors from a previous
 * pattern never bleed into col[1]/col[2] on the controller. Two colors cycle
 * (A,B,A) so tri-effects show no black band; one color gets black companions.
 * @param {number[][]} rgbColors
 * @returns {number[][]}
 */
function padToThreeColors(rgbColors) {
  if (rgbColors.length === 0) return [[255, 255, 255], [0, 0, 0], [0, 0, 0]];
  if (rgbColors.length === 1) return [rgbColors[0], [0, 0, 0], [0, 0, 0]];
  if (rgbColors.length === 2) return [rgbColors[0], rgbColors[1], rgbColors[0]];
  return rgbColors.slice(0, 3);
}

/**
 * Converts app brightness (0–100) to WLED brightness (0–255).
 * @param {number} pct - 0–100
 * @returns {number}
 */
export function brightnessToWled(pct) {
  return Math.round(Math.max(0, Math.min(100, pct)) * 2.55);
}

/** Fetch with a hard timeout — prevents the UI from hanging when hub is offline. */
async function fetchWithTimeout(url, options = {}, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function _post(path, payload) {
  console.log(`[API] POST ${path}`, payload);
  if (!HARDWARE_CONNECTED) return null;
  try {
    const res = await fetchWithTimeout(`http://${HUB_IP}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn(`[API] POST ${path} failed:`, err.message);
    return null;
  }
}

async function _get(path) {
  console.log(`[API] GET ${path}`);
  if (!HARDWARE_CONNECTED) return null;
  try {
    const res = await fetchWithTimeout(`http://${HUB_IP}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn(`[API] GET ${path} failed:`, err.message);
    return null;
  }
}

// ─── Hub Address ──────────────────────────────────────────────────────────────

/**
 * Sets (or changes) the hub IP at runtime. Persists to localStorage.
 * @param {string} ip - e.g. "192.168.1.42"
 */
export function setHubAddress(ip) {
  HUB_IP = ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
  localStorage.setItem('leaflight_hub_ip', HUB_IP);
}

/** Returns the currently configured hub IP. */
export function getHubAddress() {
  return HUB_IP;
}

/** Returns true if a hub IP has been configured. */
export function isHubConfigured() {
  return HUB_IP.length > 0;
}

// ─── Connection ───────────────────────────────────────────────────────────────

/**
 * Connects to the WLED controller at the given IP address.
 * Sets HARDWARE_CONNECTED = true on success so subsequent calls reach hardware.
 *
 * @param {string} ipAddress - e.g. "192.168.1.42"
 * @returns {Promise<{ connected: boolean, firmwareVersion: string, ledCount: number }>}
 */
export async function connect(ipAddress) {
  console.log('[API] connect', { ip: ipAddress });
  setHubAddress(ipAddress);
  HARDWARE_CONNECTED = false; // stale flag must not survive an IP change or failed reconnect
  try {
    const res = await fetchWithTimeout(`http://${HUB_IP}/json/info`);
    if (res.ok) {
      const info = await res.json();
      HARDWARE_CONNECTED = true;
      return {
        connected: true,
        firmwareVersion: info.ver ?? 'unknown',
        ledCount: info.leds?.count ?? 0,
      };
    }
  } catch {
    // fall through
  }
  return { connected: false, firmwareVersion: '0.0.0', ledCount: 0 };
}

/**
 * Marks the controller as disconnected. Subsequent calls log but do not reach hardware.
 */
export function disconnect() {
  console.log('[API] disconnect');
  HARDWARE_CONNECTED = false;
}

/**
 * Attempts to auto-discover a WLED device on the local network via mDNS.
 * @returns {Promise<string|null>} Discovered hostname/IP, or null if not found.
 */
export async function discoverHub() {
  const candidates = ['wled.local', 'wled-leaffilter.local'];
  for (const host of candidates) {
    try {
      const res = await fetchWithTimeout(`http://${host}/json/info`, {}, 1500);
      if (res.ok) {
        setHubAddress(host);
        return host;
      }
    } catch {
      // try next
    }
  }
  return null;
}

// ─── Status ───────────────────────────────────────────────────────────────────

/**
 * Fetches current controller state. Returns null when hardware is not connected.
 * @returns {Promise<{ on: boolean, brightness: number, activeEffect: number, zones: object[] } | null>}
 */
export async function getStatus() {
  const data = await _get('/json/state');
  if (!data) return null;
  return {
    on: data.on,
    brightness: Math.round((data.bri ?? 0) / 2.55),
    activeEffect: data.seg?.[0]?.fx ?? 0,
    zones: data.seg ?? [],
  };
}

/**
 * Fetches raw WLED state object. Useful for full state sync on app open.
 * @returns {Promise<object|null>}
 */
export async function getHardwareState() {
  return _get('/json/state');
}

/**
 * Fetches device info (name, firmware version, LED count, etc.).
 * @returns {Promise<object|null>}
 */
export async function getHardwareInfo() {
  return _get('/json/info');
}

// ─── Core Control ─────────────────────────────────────────────────────────────

/**
 * Applies a color, brightness, and movement pattern to the given zones.
 * Each zone object must carry its own segId — there is no internal lookup table.
 *
 * @param {{ color: string, brightness: number, movement: string, zones?: Array<{segId: number}> }} options
 * @returns {Promise<void>}
 */
export async function setPattern({ color, brightness, movement, zones = [] }) {
  const col = padToThreeColors([hexToRgb(color)]);
  const { fx, pal } = effectForMovement(movement, 1);

  const segments = zones.map(z => ({
    id: z.segId, col, fx, sx: 128, ix: 128, pal, on: true,
  }));

  return _post('/json/state', {
    on: true,
    bri: brightnessToWled(brightness),
    seg: segments,
  });
}

/**
 * Sends current app state to the WLED controller.
 * Convenience wrapper used before zone-level setPattern is wired in.
 *
 * @param {object} state - Global app state
 * @param {string[]} [patternColors] - Hex color strings for the pattern
 * @returns {Promise<object|null>}
 */
export async function applyToHardware(state, patternColors = []) {
  if (!isHubConfigured()) return null;

  const colors = padToThreeColors(patternColors.map(hexToRgb));
  const { fx, pal } = effectForMovement(state.selectedMovement, patternColors.length);

  // Inactive zones get an explicit off — otherwise they keep playing the old pattern
  const segments = state.allZones.map(zone => {
    if (!zone.active) return { id: zone.segId, on: false };
    return {
      id: zone.segId,  // segId from zone object — not the loop index
      on: state.lightsOn !== false,
      col: colors,
      fx,
      sx: 128,
      ix: 128,
      pal,
    };
  });

  return _post('/json/state', {
    on: state.lightsOn !== false,
    bri: brightnessToWled(state.brightness),
    transition: 5,
    seg: segments,
  });
}

/**
 * Sets global brightness across the entire controller.
 * @param {number} value - 0–100
 * @returns {Promise<void>}
 */
export async function setBrightness(value) {
  return _post('/json/state', { bri: brightnessToWled(value) });
}

/**
 * Turns all lights on or off.
 * @param {boolean} on
 * @returns {Promise<void>}
 */
export async function setLightsOn(on) {
  return _post('/json/state', { on });
}

/**
 * @deprecated Use setLightsOn instead.
 */
export async function setPower(on) {
  return setLightsOn(on);
}

/**
 * Activates or deactivates a single zone (WLED segment on/off).
 * Pass the full zone object from state.allZones — segId is read directly.
 *
 * @param {{ segId: number }} zone - Zone object from state.allZones
 * @param {boolean} active
 * @returns {Promise<void>}
 */
export async function setZoneActive(zone, active) {
  if (!zone || zone.segId == null) {
    console.warn('[API] setZoneActive: zone object with segId required');
    return;
  }
  return _post('/json/state', { seg: [{ id: zone.segId, on: active }] });
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

/**
 * Applies a scene across the given zones. WLED supports up to 3 colors
 * (primary/secondary/tertiary) per segment; additional colors are ignored.
 * Zones flagged active:false are switched off so they don't keep playing the
 * previous pattern; zones without an active flag are treated as active.
 *
 * @param {{ colors: string[], movement: string, speed?: number, brightness?: number, zones?: Array<{segId: number, active?: boolean}> }} scene
 * @returns {Promise<void>}
 */
export async function applyScene({ colors = [], movement = 'Stationary', speed = 128, brightness = 80, zones = [] }) {
  const rgbColors = padToThreeColors(colors.map(hexToRgb));
  const { fx, pal } = effectForMovement(movement, Math.min(colors.length, 3));

  const segments = zones.map(z => (z.active === false
    ? { id: z.segId, on: false }
    : { id: z.segId, col: rgbColors, fx, sx: speed, ix: 128, pal, on: true }));

  return _post('/json/state', {
    on: true,                            // a scene apply implies lights on
    bri: brightnessToWled(brightness),   // global brightness — segment bri would multiply against it
    seg: segments,
  });
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Syncs schedule data to a cloud relay or companion microcontroller.
 * WLED has no native time-based scheduling; this is a stub for a future endpoint.
 *
 * @param {Array<{ id: number, time: string, action: string, active: boolean }>} schedules
 * @returns {Promise<void>}
 */
export async function syncSchedules(schedules) {
  // Stub: no-op — cloud relay endpoint not yet defined.
  console.log('[API] syncSchedules (stub)', { count: schedules.length, schedules });
  return Promise.resolve();
}

// ─── Wiring Guide ─────────────────────────────────────────────────────────────
//
// Add this import at the top of each wiring target:
//   import * as api from '../api.js';
//
// All calls can be fire-and-forget — hardware is offline-tolerant.
// Pattern:  zone.active = newValue; api.setZoneActive(zone, newValue);
//
// ── src/main.js ──────────────────────────────────────────────────────────────
//   WHEN:  App init, after onboarding confirms an IP address
//   CALL:  await api.connect(ipAddress)
//
//   WHEN:  App opens and hub was previously paired
//   CALL:  api.getHardwareState() to sync brightness/effect from controller
//
// ── src/screens/home.js ──────────────────────────────────────────────────────
//   WHEN:  User confirms color+movement selection (~line 548)
//   CALL:  api.setPattern({ color: hex, brightness, movement: selectedMovement,
//                           zones: state.allZones.filter(z => z.active) })
//
//   WHEN:  Brightness slider settles (debounce 'input' ~200ms or on 'change')
//   CALL:  api.setBrightness(brightness)
//
// ── src/screens/control.js ───────────────────────────────────────────────────
//   WHEN:  Power button toggled (~line 332)
//   CALL:  api.setLightsOn(state.lightsOn)
//
//   WHEN:  Zone chip toggled (individual zone, ~line 361)
//   CALL:  api.setZoneActive(zone, active)   // zone = full object from state.allZones
//
//   WHEN:  Brightness slider changes (~line 370) — debounce ~200ms
//   CALL:  api.setBrightness(brightness)
//
//   WHEN:  Color or movement confirmed from control screen (~line 388)
//   CALL:  api.setPattern({ color, brightness, movement,
//                           zones: state.allZones.filter(z => z.active) })
//
// ── src/screens/scenes.js ────────────────────────────────────────────────────
//   WHEN:  User taps a scene card to apply it (~line 182)
//   CALL:  api.applyScene({ colors: scene.colors, movement: scene.movement,
//                           speed: scene.speed ?? 128,
//                           brightness: state.brightness,
//                           zones: state.allZones.filter(z => z.active) })
//
// ── src/screens/zones.js ─────────────────────────────────────────────────────
//   WHEN:  Individual zone toggle (~line 79)
//   CALL:  api.setZoneActive(zone, zone.active)   // zone = full object
//
//   WHEN:  "All on" (~line 88)
//   CALL:  api.setLightsOn(true)
//
//   WHEN:  "All off" (~line 93)
//   CALL:  api.setLightsOn(false)
//
// ── src/screens/schedule.js ──────────────────────────────────────────────────
//   WHEN:  Schedule saved, deleted, or toggled (~lines 61, 68)
//   CALL:  api.syncSchedules(state.schedules)
//
// ─────────────────────────────────────────────────────────────────────────────
