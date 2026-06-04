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
//    API already supports this via setPattern({ zoneIds: ['front'] }) — the
//    work is on the UI side (zone selector bar + per-zone state tracking).
//  • Multi-controller: customer has 2+ hubs (e.g. house + outbuilding).
//    Each hub is a separate WLED instance; app manages multiple IPs.
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
 */
export const WLED_EFFECT_MAP = {
  Stationary: 0,   // Solid
  Chase:      28,  // Chase
  Twinkle:    17,  // Twinkle
  Wave:       67,  // Colorwaves
  Fade:       12,  // Fade
  Meteor:     76,  // Meteor
  Pulse:      100, // Heartbeat
  Bounce:     91,  // Bouncing Balls
};

/**
 * Maximum zones per controller. Each zone = one GPIO output = one wire run.
 * The QuinLED Dig-Quad has 4 outputs; most homes use 1–2.
 */
export const MAX_ZONES_PER_CONTROLLER = 4;

/**
 * Zone configuration — populated during installer setup, stored in localStorage.
 * Each entry: { id, name, segId, ledCount }
 *
 * Defaults to a single "All Lights" zone. The installer app (or onboarding flow)
 * calls configureZones() to set up the actual zone layout per-home.
 *
 * Multi-controller note: If a customer has a second controller (e.g., outbuilding),
 * it runs as a separate WLED instance with its own IP. The app would manage it
 * as a second "hub" — not as additional zones on the same controller.
 */
let zoneConfig = JSON.parse(localStorage.getItem('leaflight_zones') || 'null') || [
  { id: 'zone1', name: 'All Lights', segId: 0, ledCount: 50 },
];

/**
 * Sets up the zone layout for this installation. Called once by the installer
 * during initial setup. Persists to localStorage.
 *
 * @param {Array<{ id: string, name: string, segId: number, ledCount: number }>} zones
 * @example
 *   configureZones([
 *     { id: 'front',  name: 'Front Roofline', segId: 0, ledCount: 60 },
 *     { id: 'garage', name: 'Garage',         segId: 1, ledCount: 25 },
 *   ]);
 */
export function configureZones(zones) {
  zoneConfig = zones.slice(0, MAX_ZONES_PER_CONTROLLER);
  localStorage.setItem('leaflight_zones', JSON.stringify(zoneConfig));
}

/** Returns the current zone configuration. */
export function getZones() {
  return [...zoneConfig];
}

/** Looks up a zone by its ID. Returns undefined if not found. */
export function getZoneById(id) {
  return zoneConfig.find(z => z.id === id);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a hex color string to an [R, G, B, W] array for WLED RGBW payloads.
 * The white channel is auto-calculated: if the RGB values are roughly equal
 * (i.e., the user picked a white/warm tone), the common value is shifted into
 * the dedicated W channel for a cleaner white from the RGBW puck.
 *
 * @param {string} hex - e.g. "#FF1493" or "FF1493"
 * @returns {[number, number, number, number]}
 */
function hexToRgbw(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Extract the white component: the minimum of R, G, B
  // This gives cleaner whites on RGBW strips vs. mixing RGB to approximate white
  const w = Math.min(r, g, b);
  return [r - w, g - w, b - w, w];
}

/** Shorthand — returns RGB only (no white channel) for non-RGBW contexts. */
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
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
 * Applies a color, brightness, and movement pattern to one or more zones.
 * Targets all zones when zoneIds is omitted.
 *
 * @param {{ color: string, brightness: number, movement: string, zoneIds?: string[] }} options
 * @returns {Promise<void>}
 */
export async function setPattern({ color, brightness, movement, zoneIds }) {
  const rgb = hexToRgb(color);
  const bri = brightnessToWled(brightness);
  const fx  = WLED_EFFECT_MAP[movement] ?? 0;

  // Target specific zones by ID, or all configured zones if none specified
  const targets = zoneIds
    ? zoneConfig.filter(z => zoneIds.includes(z.id))
    : zoneConfig;

  const segments = targets.map(z => ({
    id: z.segId, col: [rgb], fx, sx: 128, ix: 128, bri, on: true,
  }));

  return _post('/json/state', { seg: segments });
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

  const activeZones = state.allZones.filter(z => z.active);
  const segments = activeZones.map((zone, i) => {
    const colors = patternColors.length > 0
      ? patternColors.map(hexToRgb)
      : [[255, 255, 255]];
    return {
      id: i,
      on: state.lightsOn !== false,
      col: colors.slice(0, 3),
      fx: WLED_EFFECT_MAP[state.selectedMovement] ?? 0,
      sx: 128,
      ix: 128,
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
 * @param {string} zoneId - Must match an id in the zone config
 * @param {boolean} active
 * @returns {Promise<void>}
 */
export async function setZoneActive(zoneId, active) {
  const zone = getZoneById(zoneId);
  if (!zone) {
    console.warn(`[API] setZoneActive: unknown zone "${zoneId}"`);
    return;
  }
  return _post('/json/state', { seg: [{ id: zone.segId, on: active }] });
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

/**
 * Applies a scene across all zones. WLED supports up to 3 palette colors
 * (primary/secondary/tertiary) per segment; additional colors are ignored.
 *
 * @param {{ colors: string[], movement: string, speed?: number, brightness?: number }} scene
 * @returns {Promise<void>}
 */
export async function applyScene({ colors = [], movement = 'Stationary', speed = 128, brightness = 80 }) {
  const rgbColors = colors.slice(0, 3).map(hexToRgb);
  const fx  = WLED_EFFECT_MAP[movement] ?? 0;
  const bri = brightnessToWled(brightness);

  // Apply to all configured zones (same pattern everywhere)
  const segments = zoneConfig.map(z => ({
    id: z.segId, col: rgbColors, fx, sx: speed, ix: 128, bri, on: true,
  }));

  return _post('/json/state', { seg: segments });
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
// Pattern:  state.x = newValue; api.setX(newValue);
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
//                           zoneIds: state.activeZones })
//
//   WHEN:  Brightness slider settles (debounce 'input' ~200ms or on 'change')
//   CALL:  api.setBrightness(brightness)
//
// ── src/screens/control.js ───────────────────────────────────────────────────
//   WHEN:  Power button toggled (~line 332)
//   CALL:  api.setLightsOn(state.lightsOn)
//
//   WHEN:  Zone chip toggled (individual zone, ~line 361)
//   CALL:  api.setZoneActive(zoneId, active)
//
//   WHEN:  Brightness slider changes (~line 370) — debounce ~200ms
//   CALL:  api.setBrightness(brightness)
//
//   WHEN:  Color or movement confirmed from control screen (~line 388)
//   CALL:  api.setPattern({ color, brightness, movement, zoneIds: state.activeZones })
//
// ── src/screens/scenes.js ────────────────────────────────────────────────────
//   WHEN:  User taps a scene card to apply it (~line 182)
//   CALL:  api.applyScene({ colors: scene.colors, movement: scene.movement,
//                           speed: scene.speed ?? 128,
//                           brightness: state.brightness })
//
// ── src/screens/zones.js ─────────────────────────────────────────────────────
//   WHEN:  Individual zone toggle (~line 79)
//   CALL:  api.setZoneActive(zoneId, zone.active)
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
