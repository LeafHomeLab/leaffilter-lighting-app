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

import {
  isCloudConfigured,
  cloudUpdateDeviceState,
  cloudGetDeviceState,
  cloudSyncSchedules,
} from './cloud.js';

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

/**
 * Returns true when the app is loaded from a non-localhost origin (e.g. phone
 * accessing via a tunnel). In that case WLED requests are routed through
 * Vite's /wled-proxy to avoid firewall blocks and HTTPS → HTTP mixed-content.
 * On localhost (laptop) this returns false — direct connections are used.
 */
function useProxy() {
  const h = window.location.hostname;
  return h !== 'localhost' && h !== '127.0.0.1';
}

/**
 * Builds the full URL for a WLED API path.
 * - Localhost (laptop): http://<HUB_IP><path>  (direct, unchanged)
 * - Remote (phone):     /wled-proxy<path>       (proxied through Vite)
 */
function wledUrl(path) {
  if (useProxy()) return `/wled-proxy${path}`;
  return `http://${HUB_IP}${path}`;
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

// ─── Cloud fallback transport ─────────────────────────────────────────────────
// Only /json/state is meaningful remotely: its payload maps 1:1 onto the
// device shadow's desired/reported state (docs/backend-architecture.md §3.2).
// Config endpoints (/json/cfg, /json/info) stay LAN-only — the cloud registry
// carries that data instead. Gated: cloud.js resolves null until the
// lf_cloud_enabled flag + API base are configured, so default behavior is
// byte-identical to before.

async function cloudFallbackPost(path, payload) {
  if (path !== '/json/state' || !isCloudConfigured()) return null;
  console.log(`[API] POST ${path} → cloud shadow fallback`);
  return cloudUpdateDeviceState(payload);
}

async function cloudFallbackGet(path) {
  if (path !== '/json/state' || !isCloudConfigured()) return null;
  console.log(`[API] GET ${path} → cloud shadow fallback`);
  return cloudGetDeviceState();
}

async function _post(path, payload) {
  console.log(`[API] POST ${path}`, payload);
  if (!HARDWARE_CONNECTED) return cloudFallbackPost(path, payload);
  try {
    const res = await fetchWithTimeout(wledUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn(`[API] POST ${path} failed:`, err.message);
    return cloudFallbackPost(path, payload);
  }
}

async function _get(path) {
  console.log(`[API] GET ${path}`);
  if (!HARDWARE_CONNECTED) return cloudFallbackGet(path);
  try {
    const res = await fetchWithTimeout(wledUrl(path));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn(`[API] GET ${path} failed:`, err.message);
    return cloudFallbackGet(path);
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
    const res = await fetchWithTimeout(wledUrl('/json/info'));
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

// ─── Zone Detection & Provisioning ────────────────────────────────────────────
//
// A "zone" is one physical light string on one controller output (the Dig-Quad
// has 4 outputs; most homes wire 1–2). WLED exposes the wired outputs in
// /json/cfg → hw.led.ins, and zones map 1:1 onto WLED segments. The app owns
// the segment layout: on connect it provisions one segment per output
// (idempotent) so app zones and hardware always agree.

/**
 * Fetches the controller's hardware configuration (LED outputs, pins, etc.).
 * @returns {Promise<object|null>}
 */
export async function getHardwareConfig() {
  return _get('/json/cfg');
}

/**
 * Detects the physical LED outputs wired on the controller.
 * Primary source: /json/cfg hw.led.ins (one entry per configured output).
 * Fallback: the board's existing segment list when cfg is unavailable.
 *
 * @returns {Promise<Array<{start: number, leds: number, pin: number|null}>|null>}
 */
async function detectOutputs() {
  const cfg = await getHardwareConfig();
  const ins = cfg?.hw?.led?.ins;
  if (Array.isArray(ins) && ins.length > 0) {
    const outputs = ins
      .filter(b => (b.len ?? 0) > 0)
      .map(b => ({ start: b.start ?? 0, leds: b.len, pin: Array.isArray(b.pin) ? b.pin[0] : null }))
      .sort((a, b) => a.start - b.start);
    if (outputs.length > 0) return outputs;
  }
  // Fallback: mirror the segments the installer configured on the board
  const st = await _get('/json/state');
  if (!Array.isArray(st?.seg)) return null;
  const outputs = st.seg
    .filter(s => (s.stop ?? 0) > (s.start ?? 0))
    .map(s => ({ start: s.start, leds: s.stop - s.start, pin: null }))
    .sort((a, b) => a.start - b.start);
  return outputs.length > 0 ? outputs : null;
}

/**
 * Ensures the board has exactly one segment per physical output (segment id =
 * output index), deleting leftover segments beyond the output count. Idempotent:
 * writes nothing when the layout already matches.
 *
 * @returns {Promise<Array<{segId: number, leds: number, pin: number|null}>|null>}
 *   One descriptor per detected zone, or null when detection failed.
 */
export async function syncZonesWithHardware() {
  if (!HARDWARE_CONNECTED) return null;
  const outputs = await detectOutputs();
  if (!outputs) return null;

  const st = await _get('/json/state');
  const existing = (st?.seg ?? []).filter(s => (s.stop ?? 0) > 0);
  const aligned = existing.length === outputs.length && outputs.every((o, i) => {
    const seg = existing.find(s => s.id === i);
    return seg && seg.start === o.start && seg.stop === o.start + o.leds;
  });

  if (!aligned) {
    const seg = outputs.map((o, i) => ({ id: i, start: o.start, stop: o.start + o.leds, grp: 1, spc: 0, on: true }));
    for (const s of existing) {
      if (s.id >= outputs.length) seg.push({ id: s.id, stop: 0 }); // stop:0 deletes the segment
    }
    await _post('/json/state', { seg });
  }

  return outputs.map((o, i) => ({ segId: i, leds: o.leds, pin: o.pin }));
}

/**
 * Reconciles the app's zone list with the zones detected on the connected
 * controller. Hardware is the source of truth for which zones exist and their
 * LED counts; user-facing fields (name, active, color, scene) are preserved by
 * segId. New outputs appear as "Zone N" until renamed.
 *
 * Single-hub model: HUB_IP belongs to controllers[0]. Multi-controller routing
 * is a v2 concern — see FUTURE notes at the top of this file.
 *
 * @param {object} state - Global app state (controllers[0].zones is replaced)
 * @returns {Promise<number|null>} Detected zone count, or null when offline/undetectable.
 */
let _reconcileInFlight = null;

export async function reconcileZonesWithHardware(state) {
  // Auto-connect and a manual Connect click can race — share one sync pass
  if (_reconcileInFlight) return _reconcileInFlight;
  _reconcileInFlight = _reconcileZones(state);
  try {
    return await _reconcileInFlight;
  } finally {
    _reconcileInFlight = null;
  }
}

async function _reconcileZones(state) {
  const detected = await syncZonesWithHardware();
  if (!detected) return null;

  const ctrl = state.controllers[0];
  ctrl.zones = detected.map(d => {
    const prev = ctrl.zones.find(z => z.segId === d.segId);
    return {
      id:         prev?.id ?? `zone-seg${d.segId}`,
      name:       prev?.name ?? `Zone ${d.segId + 1}`,
      shortName:  prev?.shortName ?? `Zone ${d.segId + 1}`,
      leds:       d.leds,
      segId:      d.segId,
      active:     prev?.active ?? true,
      color:      prev?.color ?? null,
      brightness: prev?.brightness ?? null,
      scene:      prev?.scene ?? null,
      hw:         true,  // backed by a real output on the connected hub
    };
  });

  window.dispatchEvent(new Event('lf:save-state'));
  return detected.length;
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

  // Primary controller only — other controllers' zones reuse segIds and would
  // collide on this hub. Per-controller routing is v2.
  const hubZones = state.controllers[0]?.zones ?? [];

  // Inactive zones get an explicit off — otherwise they keep playing the old pattern
  const segments = hubZones.map(zone => {
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
  // Zones flagged hw:false belong to a controller that isn't the connected hub
  // (e.g. the demo "Back Patio") — their segIds would collide with real segments.
  if (zone.hw === false) {
    console.log('[API] setZoneActive: skipping non-hardware zone', zone.id);
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

  const segments = zones
    .filter(z => z.hw !== false)  // simulated zones must never reach the hub
    .map(z => (z.active === false
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
 * Syncs the schedule list to the cloud, which executes it (EventBridge —
 * docs/backend-architecture.md §3.5). Until the cloud flag + backend exist,
 * this remains a logged no-op exactly like the original stub.
 *
 * @param {Array<object>} schedules - state.schedules entries
 * @returns {Promise<object|null>}
 */
export async function syncSchedules(schedules) {
  if (isCloudConfigured()) {
    console.log('[API] syncSchedules → cloud', { count: schedules.length });
    return cloudSyncSchedules(schedules);
  }
  console.log('[API] syncSchedules (stub — cloud not configured)', { count: schedules.length });
  return null;
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
