# LeafFilter WLED — Firmware Spike (Phase 0)

This folder holds the **LeafFilter WLED** usermods and build config for the
Phase 0 feasibility spike from `docs/backend-architecture.md` (§5, §7).

> **Destination:** this code will move to its own repo (`lighting-firmware`,
> a fork of [wled/WLED](https://github.com/wled/WLED)) once the company GitHub
> org repos exist. It lives here temporarily so it's versioned from day one.

## What the spike must answer

**Can a 4 MB ESP32 (Dig-Quad class) run the WLED LED pipeline + BLE
provisioning + a TLS MQTT connection simultaneously without starving the
heap?** This is the single biggest technical risk in the architecture — it
gates funding of everything behind it.

### Pass criteria

| Metric (from heap telemetry) | Pass |
|---|---|
| `minHeap` with all outputs animating + MQTT connected | > 20 kB |
| `maxBlock` (largest allocatable block — fragmentation) | > 8 kB |
| Soak: 24 h with an effect running, phone reconnecting BLE occasionally | no reboots / watchdog resets |
| Flash: `lf_spike` image fits app partition | link succeeds (see partition note in `platformio_override.ini`) |

If it fails: options are (a) more `WLED_DISABLE_*` trimming, (b) run BLE only
until provisioned then release it (`NimBLEDevice::deinit(true)` frees ~60 kB —
likely the production behavior anyway), (c) WROVER/S3 module on the next board
rev. Record numbers either way — they go in the review doc.

## Contents

| File | Purpose |
|---|---|
| `usermods/LF_BLE_Provisioning/usermod_lf_ble_provisioning.h` | GATT service matching the app's `src/ble.js` (device info, Wi-Fi creds, status notify) + claim proof-of-possession token (arch §3.4) |
| `usermods/LF_Cloud_Agent/usermod_lf_cloud_agent.h` | Outbound TLS MQTT (spike: `test.mosquitto.org:8883`, no AWS account needed) + heap telemetry every 30 s |
| `platformio_override.ini` | `lf_spike` build environment |

## Build & flash (Windows)

1. **Install PlatformIO CLI** (once): `pip install platformio` — or use the
   VS Code PlatformIO extension.
2. **Clone WLED at the pinned version** (matches the firmware verified on the
   Dig-Quad):
   ```
   git clone --branch v0.14.4 --depth 1 https://github.com/wled/WLED.git
   ```
3. **Copy the usermod folders** into the checkout:
   ```
   WLED/usermods/LF_BLE_Provisioning/
   WLED/usermods/LF_Cloud_Agent/
   ```
4. **Register the usermods** — edit `WLED/wled00/usermods_list.cpp`:
   ```cpp
   // with the other includes:
   #ifdef USERMOD_LF_BLE_PROVISIONING
     #include "../usermods/LF_BLE_Provisioning/usermod_lf_ble_provisioning.h"
   #endif
   #ifdef USERMOD_LF_CLOUD_AGENT
     #include "../usermods/LF_Cloud_Agent/usermod_lf_cloud_agent.h"
   #endif

   // inside registerUsermods():
   #ifdef USERMOD_LF_BLE_PROVISIONING
     usermods.add(new LFBLEProvisioningUsermod());
   #endif
   #ifdef USERMOD_LF_CLOUD_AGENT
     usermods.add(new LFCloudAgentUsermod());
   #endif
   ```
5. **Copy `platformio_override.ini`** to the root of the WLED checkout.
6. **Build, flash, watch:**
   ```
   pio run -e lf_spike
   pio run -e lf_spike -t upload      # board on USB
   pio device monitor -b 115200
   ```
   Expect `[LF-BLE] Advertising as LF-Controller-…` and, once on Wi-Fi,
   `[LF-Cloud] MQTT up. Heap after TLS: …` followed by heap JSON every 30 s.
   The build may need small compile fixes against 0.14.4 internals (e.g. the
   `busses` global) — that's normal for a first spike pass; report errors back
   and I'll patch.

## Running the measurement

1. Flash, provision Wi-Fi (via the app over BLE, or the WLED captive portal —
   both fine for the spike).
2. Configure all LED outputs as wired (Settings → LED Preferences), start a
   busy effect on all segments at full length.
3. Let it soak ≥ 24 h. Collect the serial log (or subscribe:
   `mosquitto_sub -h test.mosquitto.org -p 8883 --insecure -t 'lf/spike/#'`).
4. Record: heap cost of TLS connect (printed once), steady-state `heap`,
   lowest `minHeap`, lowest `maxBlock`, any resets.

## Security posture of this spike (do not skip reading)

- `LF_SPIKE_INSECURE=1` performs a **real TLS handshake without certificate
  validation** — identical RAM footprint, zero trust. It exists only to
  measure memory without an AWS account. It must never reach a customer
  device; the flag is compile-time and off in any production env.
- Wi-Fi credentials cross the GATT link **plaintext** in this spike. The
  production build adds app-layer ECDH session encryption (arch doc §6)
  before any customer install.
- `test.mosquitto.org` is a public broker: the heap telemetry published there
  contains no secrets (heap numbers, uptime, RSSI, MAC-derived ID) — keep it
  that way; don't add fields to `reportHeap()` while pointed at a public broker.
- The mutual-TLS mode (`LF_SPIKE_INSECURE=0`) has cert/key **placeholders in
  the source** for a throwaway dev cert only. Per-device certs come from AWS
  fleet provisioning into NVS in Phase 1; real credentials never get committed
  or baked into images.
