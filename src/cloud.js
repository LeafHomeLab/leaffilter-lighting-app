// ─── LeafFilter Lighting → Cloud App API Client ──────────────────────────────
//
// Client for the Phase 1 backend (docs/backend-architecture.md §3). The app
// prefers the direct LAN path in api.js; this module is the remote transport:
// the same WLED /json/state payloads, written to the device shadow via the
// App API instead of POSTed to the controller.
//
// EVERYTHING HERE IS GATED: until the cloud flag is set AND an API base URL
// is configured, every function resolves to null immediately — identical to
// the existing demo-mode behavior in api.js. Flipping the flag on a device
// with no backend deployed degrades to exactly today's behavior.
//
// Enable for development (browser console):
//   localStorage.lf_cloud_enabled = '1'
//   localStorage.lf_cloud_api_base = 'https://<api-id>.execute-api.<region>.amazonaws.com/dev'
//
// Auth: Cognito OIDC. Until the sign-in flow lands, a dev token can be set
// via localStorage.lf_cloud_token. Real flow replaces this with the Cognito
// SDK session (and never persists raw tokens long-term).
//
// API surface (mirrors arch doc §3.3–§3.5; server does not exist yet):
//   GET  /devices                      → [{ deviceId, serial, name, zones[] }]
//   POST /devices/claim                { serial, popToken }
//   GET  /devices/{id}/state           → shadow reported (WLED /json/state shape)
//   PUT  /devices/{id}/state           shadow desired  (WLED /json/state shape)
//   PUT  /schedules                    full schedule list (replaces syncSchedules stub)
//   PUT  /config                       zones/scenes/settings snapshot
// ─────────────────────────────────────────────────────────────────────────────

const FLAG_KEY      = 'lf_cloud_enabled';
const BASE_KEY      = 'lf_cloud_api_base';
const TOKEN_KEY     = 'lf_cloud_token';
const DEVICE_ID_KEY = 'lf_cloud_device_id';

const TIMEOUT_MS = 5000; // remote path tolerates more latency than LAN's 3s

/** Feature flag: master switch for all cloud behavior. Default OFF. */
export function isCloudEnabled() {
  try { return localStorage.getItem(FLAG_KEY) === '1'; } catch { return false; }
}

/** True when the cloud path is enabled AND minimally configured. */
export function isCloudConfigured() {
  try { return isCloudEnabled() && !!localStorage.getItem(BASE_KEY); } catch { return false; }
}

/**
 * The claimed device this app instance controls remotely (single-controller
 * model, same assumption as HUB_IP in api.js). Set during the claim flow;
 * multi-controller routing arrives with the Phase 2 registry hydration.
 */
export function getCloudDeviceId() {
  try { return localStorage.getItem(DEVICE_ID_KEY) || null; } catch { return null; }
}

export function setCloudDeviceId(id) {
  try { localStorage.setItem(DEVICE_ID_KEY, id); } catch { /* private mode */ }
}

// ─── HTTP core ────────────────────────────────────────────────────────────────

async function request(method, path, body) {
  if (!isCloudConfigured()) return null;
  const base = localStorage.getItem(BASE_KEY).replace(/\/$/, '');
  const token = localStorage.getItem(TOKEN_KEY);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    console.log(`[Cloud] ${method} ${path}`);
    const res = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 401 || res.status === 403) {
      // Session expired / not signed in. The sign-in flow (Phase 1) hooks in
      // here; until then, fail soft like every other offline path in the app.
      console.warn(`[Cloud] ${method} ${path}: not authorized (${res.status})`);
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.status === 204 ? {} : res.json();
  } catch (err) {
    console.warn(`[Cloud] ${method} ${path} failed:`, err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Device state (shadow) ────────────────────────────────────────────────────

/**
 * Writes desired state for the device — the exact WLED /json/state payload
 * the LAN path sends. Used by api.js as the remote fallback transport.
 * @param {object} wledStatePayload - e.g. { on, bri, seg: [...] }
 * @returns {Promise<object|null>} accepted desired state, or null (unconfigured/offline)
 */
export async function cloudUpdateDeviceState(wledStatePayload) {
  const id = getCloudDeviceId();
  if (!id) return null;
  return request('PUT', `/devices/${encodeURIComponent(id)}/state`, wledStatePayload);
}

/**
 * Reads the device's last reported state (WLED /json/state shape).
 * @returns {Promise<object|null>}
 */
export async function cloudGetDeviceState() {
  const id = getCloudDeviceId();
  if (!id) return null;
  return request('GET', `/devices/${encodeURIComponent(id)}/state`);
}

// ─── Registry / onboarding ────────────────────────────────────────────────────

/**
 * Claims a controller into the signed-in account. popToken is the
 * proof-of-possession value read over BLE during onboarding (arch §3.4).
 * @returns {Promise<{ deviceId: string }|null>}
 */
export async function cloudClaimDevice(serial, popToken) {
  const res = await request('POST', '/devices/claim', { serial, popToken });
  if (res?.deviceId) setCloudDeviceId(res.deviceId);
  return res;
}

/** Lists the account's controllers (hydrates state.controllers in Phase 2). */
export async function cloudListDevices() {
  return request('GET', '/devices');
}

// ─── Config & schedules ───────────────────────────────────────────────────────

/**
 * Replaces the account's schedule list — the real implementation behind
 * api.js syncSchedules(). Cloud executes them (EventBridge, arch §3.5).
 */
export async function cloudSyncSchedules(schedules) {
  return request('PUT', '/schedules', { schedules });
}

/**
 * Pushes the config snapshot (zones, scenes, vacation settings) so a phone
 * reinstall restores from the cloud instead of starting empty. Live light
 * state is NOT synced here — the shadow owns that (conflict rule, arch §3.3).
 */
export async function cloudSyncConfig(snapshot) {
  return request('PUT', '/config', snapshot);
}
