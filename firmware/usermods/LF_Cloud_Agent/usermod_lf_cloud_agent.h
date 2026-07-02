#pragma once
// ─── LeafFilter WLED — Cloud Agent Usermod (TLS-MQTT spike) ──────────────────
//
// PURPOSE OF THIS SPIKE (arch doc §5, Phase 0): answer the single question
// that gates the whole backend plan — can a 4 MB ESP32 WROOM run the WLED LED
// pipeline + BLE provisioning + a mutual-TLS MQTT connection at the same time
// without starving the heap?
//
// It maintains an outbound TLS MQTT connection and publishes heap telemetry
// every 30 s to  lf/spike/<serial>/heap  and to the serial console:
//   {"heap":…,"minHeap":…,"maxBlock":…,"uptimeS":…,"rssi":…}
//
// PASS CRITERIA (see firmware/README.md):
//   • minHeap stays > 20 kB with all LED outputs animating
//   • largest allocatable block stays > 8 kB (fragmentation check)
//   • no watchdog resets / reboots over a 24 h soak
//
// MODES (build flags, see platformio_override.ini):
//   LF_SPIKE_INSECURE=1  → full TLS handshake, but NO cert validation and NO
//                          client cert. Same RAM cost as validated TLS, zero
//                          setup. Works against test.mosquitto.org:8883.
//                          *** NEVER ship this. Spike measurement only. ***
//   LF_SPIKE_INSECURE=0  → mutual TLS for AWS IoT Core: validates Amazon Root
//                          CA and presents the device certificate. Paste the
//                          dev cert/key below (Phase 1: certs live in NVS via
//                          fleet provisioning, never in the firmware image).
//
// PRODUCTION SHAPE (not in this spike): shadow delta subscription feeding
// WLED's JSON API handler (deserializeState) + reported-state publisher.
// The topic surface is stubbed here so RAM numbers include subscriptions.
//
// Requires: PubSubClient (see platformio_override.ini). WLED's native MQTT
// (AsyncMqttClient, no TLS) must be disabled: -D WLED_DISABLE_MQTT.
// ─────────────────────────────────────────────────────────────────────────────

#include "wled.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#ifndef LF_MQTT_HOST
  #define LF_MQTT_HOST "test.mosquitto.org"   // spike default; AWS IoT ATS endpoint in secure mode
#endif
#ifndef LF_MQTT_PORT
  #define LF_MQTT_PORT 8883
#endif
#ifndef LF_SPIKE_INSECURE
  #define LF_SPIKE_INSECURE 1
#endif
#ifndef LF_HEAP_REPORT_MS
  #define LF_HEAP_REPORT_MS 30000
#endif
#define LF_MQTT_RECONNECT_MIN_MS 5000
#define LF_MQTT_RECONNECT_MAX_MS 300000   // production requirement: backoff+jitter
                                          // to avoid thundering herd at fleet scale

#if !LF_SPIKE_INSECURE
// Amazon Root CA 1 (https://www.amazontrust.com/repository/AmazonRootCA1.pem)
static const char LF_AWS_ROOT_CA[] PROGMEM = R"CERT(
-----BEGIN CERTIFICATE-----
PASTE_AMAZON_ROOT_CA_1_HERE
-----END CERTIFICATE-----
)CERT";
// Dev-only device credentials. Phase 1 replaces this with per-device certs
// issued by fleet provisioning and stored in NVS — never baked into images.
static const char LF_DEVICE_CERT[] PROGMEM = R"CERT(
-----BEGIN CERTIFICATE-----
PASTE_DEVICE_CERT_HERE
-----END CERTIFICATE-----
)CERT";
static const char LF_DEVICE_KEY[] PROGMEM = R"KEY(
-----BEGIN RSA PRIVATE KEY-----
PASTE_DEVICE_PRIVATE_KEY_HERE
-----END RSA PRIVATE KEY-----
)KEY";
#endif

class LFCloudAgentUsermod : public Usermod {
 private:
  WiFiClientSecure _tls;
  PubSubClient     _mqtt;
  char             _clientId[24]   = {0};
  char             _heapTopic[48]  = {0};
  char             _stateTopic[48] = {0};
  unsigned long    _lastAttempt    = 0;
  unsigned long    _backoffMs      = LF_MQTT_RECONNECT_MIN_MS;
  unsigned long    _lastReport     = 0;
  uint32_t         _heapBeforeTls  = 0;
  bool             _everConnected  = false;

  void buildIds() {
    uint64_t mac = ESP.getEfuseMac();
    snprintf(_clientId,   sizeof(_clientId),   "lf-%04X%08X",
             (uint16_t)(mac >> 32), (uint32_t)mac);
    snprintf(_heapTopic,  sizeof(_heapTopic),  "lf/spike/%s/heap",  _clientId);
    snprintf(_stateTopic, sizeof(_stateTopic), "lf/%s/state/desired", _clientId);
  }

  static void onMessage(char* topic, byte* payload, unsigned int len) {
    // Production: feed payload into WLED's JSON handler — it is the same
    // /json/state document the app already sends (arch doc §3.2):
    //   deserializeState(doc.as<JsonObject>(), CALL_MODE_DIRECT_CHANGE);
    // Spike: log only; the subscription exists so RAM numbers are honest.
    DEBUG_PRINTF("[LF-Cloud] msg on %s (%u bytes)\n", topic, len);
  }

  void connectMqtt() {
    _heapBeforeTls = ESP.getFreeHeap();
#if LF_SPIKE_INSECURE
    _tls.setInsecure();               // spike only — full handshake, no validation
#else
    _tls.setCACert(LF_AWS_ROOT_CA);
    _tls.setCertificate(LF_DEVICE_CERT);
    _tls.setPrivateKey(LF_DEVICE_KEY);
#endif
    DEBUG_PRINTF("[LF-Cloud] TLS connect to %s:%d (heap before: %u)\n",
                 LF_MQTT_HOST, LF_MQTT_PORT, _heapBeforeTls);
    if (_mqtt.connect(_clientId)) {
      _everConnected = true;
      _backoffMs = LF_MQTT_RECONNECT_MIN_MS;
      _mqtt.subscribe(_stateTopic, 1);
      DEBUG_PRINTF("[LF-Cloud] MQTT up. Heap after TLS: %u (cost: %u)\n",
                   ESP.getFreeHeap(), _heapBeforeTls - ESP.getFreeHeap());
    } else {
      DEBUG_PRINTF("[LF-Cloud] MQTT connect failed rc=%d, retry in %lus\n",
                   _mqtt.state(), _backoffMs / 1000);
      // Exponential backoff with ±20% jitter
      _backoffMs = min((unsigned long)(_backoffMs * 2), (unsigned long)LF_MQTT_RECONNECT_MAX_MS);
      _backoffMs += (esp_random() % (_backoffMs / 5)) - _backoffMs / 10;
    }
  }

  void reportHeap() {
    StaticJsonDocument<192> doc;
    doc["heap"]     = ESP.getFreeHeap();
    doc["minHeap"]  = ESP.getMinFreeHeap();
    doc["maxBlock"] = ESP.getMaxAllocHeap();
    doc["uptimeS"]  = millis() / 1000;
    doc["rssi"]     = WiFi.RSSI();
    char buf[192];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    DEBUG_PRINTF("[LF-Cloud] %s\n", buf);
    if (_mqtt.connected()) _mqtt.publish(_heapTopic, (uint8_t*)buf, n, false);
  }

 public:
  LFCloudAgentUsermod() : _mqtt(_tls) {}

  void setup() override {
    buildIds();
    _mqtt.setServer(LF_MQTT_HOST, LF_MQTT_PORT);
    _mqtt.setCallback(onMessage);
    _mqtt.setBufferSize(1536);   // room for a full 4-segment /json/state doc
    _mqtt.setKeepAlive(60);
    DEBUG_PRINTF("[LF-Cloud] Agent ready, clientId %s, mode %s\n",
                 _clientId, LF_SPIKE_INSECURE ? "INSECURE-SPIKE" : "mutual-TLS");
  }

  void loop() override {
    if (!Network.isConnected()) return;

    if (!_mqtt.connected()) {
      unsigned long now = millis();
      if (now - _lastAttempt >= _backoffMs || _lastAttempt == 0) {
        _lastAttempt = now;
        connectMqtt();
      }
    } else {
      _mqtt.loop();
    }

    if (millis() - _lastReport >= LF_HEAP_REPORT_MS) {
      _lastReport = millis();
      reportHeap();
    }
  }

  uint16_t getId() override { return 0x4C47; }
};
