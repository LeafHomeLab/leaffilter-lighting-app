// ─── LeafFilter Lighting → BLE Provisioning Module ──────────────────────────
//
// Handles Bluetooth Low Energy communication with the LeafFilter ESP32
// controller during initial setup (onboarding). After provisioning is
// complete, all subsequent communication happens over local HTTP (Wi-Fi)
// or the cloud MQTT relay.
//
// This module wraps @capacitor-community/bluetooth-le with LeafFilter-
// specific service UUIDs and a graceful fallback for browser-only mode
// (so the prototype still works without hardware).
//
// ─────────────────────────────────────────────────────────────────────────────

let BleClient = null;

// Try to load the BLE plugin — only activates on native platforms (iOS/Android).
// The plugin has a web shim that loads fine in browsers but can't actually scan,
// so we explicitly check Capacitor.isNativePlatform() to avoid false positives.
async function loadBlePlugin() {
  if (BleClient) return true;
  try {
    // Check if we're running inside a real native app shell
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) {
      console.log('[BLE] Running in browser — using demo mode');
      return false;
    }

    const mod = await import('@capacitor-community/bluetooth-le');
    BleClient = mod.BleClient;
    await BleClient.initialize({ androidNeverForLocation: true });
    console.log('[BLE] Plugin loaded and initialized on native platform');
    return true;
  } catch (err) {
    console.warn('[BLE] Plugin not available:', err.message);
    return false;
  }
}

// ─── Service UUIDs ──────────────────────────────────────────────────────────
//
// These must match the BLE GATT service on the ESP32 firmware.
// Using a custom 128-bit UUID base: 4C46xxxx-4C46-4C46-4C46-4C46464C4146
// ("LF" in ASCII = 0x4C46 — "LeafFilter")
//
// IMPORTANT: These are placeholder UUIDs. Once the firmware engineer
// implements the BLE service on the ESP32, update these to match.

const SERVICE_UUID            = '4c460001-4c46-4c46-4c46-4c46464c4146';
const DEVICE_INFO_CHAR_UUID   = '4c460002-4c46-4c46-4c46-4c46464c4146';  // READ
const WIFI_CREDS_CHAR_UUID    = '4c460003-4c46-4c46-4c46-4c46464c4146';  // WRITE
const CONN_STATUS_CHAR_UUID   = '4c460004-4c46-4c46-4c46-4c46464c4146';  // NOTIFY

// ─── State ──────────────────────────────────────────────────────────────────

/** Whether BLE hardware is available on this device. */
export let BLE_AVAILABLE = false;

/** The currently connected device ID (null if not connected). */
let connectedDeviceId = null;

// ─── Text encoding helpers ──────────────────────────────────────────────────

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeJson(obj) {
  return encoder.encode(JSON.stringify(obj));
}

function decodeJson(dataView) {
  const bytes = new Uint8Array(dataView.buffer);
  return JSON.parse(decoder.decode(bytes));
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Initializes the BLE module. Call once at app startup.
 * Sets BLE_AVAILABLE = true if the native plugin is loaded.
 *
 * @returns {Promise<boolean>} Whether BLE is available.
 */
export async function init() {
  BLE_AVAILABLE = await loadBlePlugin();
  return BLE_AVAILABLE;
}

/**
 * Scans for LeafFilter controllers advertising our provisioning service.
 * Returns an array of discovered devices.
 *
 * In demo mode (browser), returns a fake device after a realistic delay.
 *
 * @param {number} [timeoutMs=8000] — How long to scan before giving up.
 * @returns {Promise<Array<{ deviceId: string, name: string, rssi: number }>>}
 */
export async function scanForControllers(timeoutMs = 8000) {
  // ── Demo mode fallback ──
  if (!BLE_AVAILABLE) {
    console.log('[BLE] Demo mode: simulating controller scan...');
    await delay(2500);
    return [{
      deviceId: 'demo-device-001',
      name: 'LF-2024 Controller',
      rssi: -42,
    }];
  }

  // ── Real BLE scan ──
  const devices = [];

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      BleClient.stopLEScan();
      resolve(devices);
    }, timeoutMs);

    BleClient.requestLEScan(
      { services: [SERVICE_UUID] },
      (result) => {
        const existing = devices.find(d => d.deviceId === result.device.deviceId);
        if (!existing) {
          devices.push({
            deviceId: result.device.deviceId,
            name: result.device.name || result.localName || 'LeafFilter Controller',
            rssi: result.rssi ?? -99,
          });
          console.log('[BLE] Found device:', devices[devices.length - 1]);
        }
      },
    );
  });
}

/**
 * Connects to a controller and reads its device info.
 * Returns serial number, firmware version, LED count, and zone count.
 *
 * In demo mode, returns simulated device info.
 *
 * @param {string} deviceId — The device ID from scanForControllers()
 * @returns {Promise<{ serial: string, firmware: string, ledCount: number, zones: number }>}
 */
export async function pairController(deviceId) {
  // ── Demo mode ──
  if (!BLE_AVAILABLE) {
    console.log('[BLE] Demo mode: simulating controller pairing...');
    await delay(1200);   // Simulate connect time
    connectedDeviceId = deviceId;
    return {
      serial: 'LF24-8821-XX',
      firmware: '2.4.1',
      ledCount: 478,
      zones: 6,
    };
  }

  // ── Real BLE ──
  await BleClient.connect(deviceId, () => {
    console.log('[BLE] Device disconnected:', deviceId);
    connectedDeviceId = null;
  });

  connectedDeviceId = deviceId;
  console.log('[BLE] Connected to', deviceId);

  // Read device info characteristic
  const infoData = await BleClient.read(deviceId, SERVICE_UUID, DEVICE_INFO_CHAR_UUID);
  const deviceInfo = decodeJson(infoData);
  console.log('[BLE] Device info:', deviceInfo);

  return {
    serial: deviceInfo.serial ?? 'UNKNOWN',
    firmware: deviceInfo.firmware ?? deviceInfo.ver ?? '0.0.0',
    ledCount: deviceInfo.ledCount ?? deviceInfo.leds ?? 0,
    zones: deviceInfo.zones ?? deviceInfo.zoneCount ?? 1,
  };
}

/**
 * Sends Wi-Fi credentials to the controller and waits for it to
 * connect to the network. Returns the controller's local IP address
 * once connected, or null on failure.
 *
 * In demo mode, simulates the provisioning process.
 *
 * @param {string} deviceId — The device ID from pairController()
 * @param {string} ssid — Wi-Fi network name
 * @param {string} password — Wi-Fi password
 * @param {number} [timeoutMs=20000] — How long to wait for the controller to connect
 * @returns {Promise<{ success: boolean, ip: string|null, error?: string }>}
 */
export async function provisionWifi(deviceId, ssid, password, timeoutMs = 20000) {
  // ── Demo mode ──
  if (!BLE_AVAILABLE) {
    console.log(`[BLE] Demo mode: simulating Wi-Fi provisioning (${ssid})...`);
    await delay(3000);
    return {
      success: true,
      ip: '192.168.1.42',
    };
  }

  // ── Real BLE ──
  // Write Wi-Fi credentials to the controller
  const credsPayload = encodeJson({ ssid, password });
  await BleClient.write(deviceId, SERVICE_UUID, WIFI_CREDS_CHAR_UUID, credsPayload);
  console.log('[BLE] Wi-Fi credentials sent');

  // Subscribe to connection status notifications and wait for IP
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      BleClient.stopNotifications(deviceId, SERVICE_UUID, CONN_STATUS_CHAR_UUID).catch(() => {});
      resolve({ success: false, ip: null, error: 'Timed out waiting for controller to join Wi-Fi' });
    }, timeoutMs);

    BleClient.startNotifications(deviceId, SERVICE_UUID, CONN_STATUS_CHAR_UUID, (data) => {
      try {
        const status = decodeJson(data);
        console.log('[BLE] Connection status update:', status);

        if (status.status === 'connected' && status.ip) {
          clearTimeout(timer);
          BleClient.stopNotifications(deviceId, SERVICE_UUID, CONN_STATUS_CHAR_UUID).catch(() => {});
          resolve({ success: true, ip: status.ip });
        } else if (status.status === 'failed') {
          clearTimeout(timer);
          BleClient.stopNotifications(deviceId, SERVICE_UUID, CONN_STATUS_CHAR_UUID).catch(() => {});
          resolve({ success: false, ip: null, error: status.error || 'Wi-Fi connection failed' });
        }
      } catch (err) {
        console.warn('[BLE] Failed to parse status notification:', err);
      }
    });
  });
}

/**
 * Disconnects from the currently paired controller.
 */
export async function disconnect() {
  if (!BLE_AVAILABLE || !connectedDeviceId) return;
  try {
    await BleClient.disconnect(connectedDeviceId);
    console.log('[BLE] Disconnected from', connectedDeviceId);
  } catch (err) {
    console.warn('[BLE] Disconnect error:', err.message);
  }
  connectedDeviceId = null;
}

/**
 * Returns the currently connected device ID, or null.
 */
export function getConnectedDeviceId() {
  return connectedDeviceId;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
