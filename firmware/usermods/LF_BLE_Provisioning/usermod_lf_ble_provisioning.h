#pragma once
// ─── LeafFilter WLED — BLE Provisioning Usermod ──────────────────────────────
//
// Firmware counterpart of the app's src/ble.js. Exposes a GATT service that
// lets the mobile app (during onboarding) read device info, write Wi-Fi
// credentials, and get notified when the controller joins the network.
//
// Protocol (must stay in sync with src/ble.js in the app repo):
//   SERVICE            4c460001-4c46-4c46-4c46-4c46464c4146
//   DEVICE_INFO  READ  4c460002-…  → {"serial","firmware","ledCount","zones"}
//   WIFI_CREDS   WRITE 4c460003-…  ← {"ssid","password"}
//   CONN_STATUS  NOTIFY 4c460004-… → {"status":"connected","ip":"…"} |
//                                    {"status":"failed","error":"…"}
//   CLAIM_TOKEN  READ  4c460005-…  → {"token":"…"}   (proof-of-possession for
//                                    the cloud claim flow — arch doc §3.4;
//                                    not yet consumed by ble.js)
//
// SPIKE STATUS / PRODUCTION TODOs (arch doc §6):
//   • Credentials are written plaintext over the GATT link. Production must
//     add app-layer ECDH session encryption (BLE "Just Works" pairing alone
//     is MITM-able). Tracked as a Phase 1 hardening item.
//   • Advertising currently never stops. Production: stop advertising after
//     successful provisioning; re-enable only on factory reset / button hold.
//
// Requires: NimBLE-Arduino (see firmware/platformio_override.ini).
// Target:   WLED 0.14.x on ESP32 (QuinLED Dig-Quad class board).
// ─────────────────────────────────────────────────────────────────────────────

#include "wled.h"
#include <NimBLEDevice.h>

#define LF_BLE_SERVICE_UUID     "4c460001-4c46-4c46-4c46-4c46464c4146"
#define LF_BLE_INFO_CHAR_UUID   "4c460002-4c46-4c46-4c46-4c46464c4146"
#define LF_BLE_CREDS_CHAR_UUID  "4c460003-4c46-4c46-4c46-4c46464c4146"
#define LF_BLE_STATUS_CHAR_UUID "4c460004-4c46-4c46-4c46-4c46464c4146"
#define LF_BLE_CLAIM_CHAR_UUID  "4c460005-4c46-4c46-4c46-4c46464c4146"

// How long we wait for Wi-Fi to come up after credentials arrive
#ifndef LF_BLE_WIFI_TIMEOUT_MS
  #define LF_BLE_WIFI_TIMEOUT_MS 20000
#endif

class LFBLEProvisioningUsermod : public Usermod {
 private:
  NimBLEServer*         _server     = nullptr;
  NimBLECharacteristic* _infoChar   = nullptr;
  NimBLECharacteristic* _credsChar  = nullptr;
  NimBLECharacteristic* _statusChar = nullptr;
  NimBLECharacteristic* _claimChar  = nullptr;

  // Written from the BLE callback (NimBLE task), consumed in loop() (main task).
  // Heavy work (config save, reconnect) must NOT run in the BLE callback.
  volatile bool _credsPending = false;
  char _pendingSsid[33] = {0};
  char _pendingPass[65] = {0};

  bool          _provisioning   = false;  // creds applied, waiting for Wi-Fi
  unsigned long _provisionStart = 0;
  bool          _bleStarted     = false;

  char _serial[20]     = {0};
  char _claimToken[17] = {0};

  // ── BLE write callback (runs on NimBLE task — copy and get out) ──
  class CredsCallbacks : public NimBLECharacteristicCallbacks {
   public:
    explicit CredsCallbacks(LFBLEProvisioningUsermod* um) : _um(um) {}
    void onWrite(NimBLECharacteristic* c) override {
      std::string v = c->getValue();
      StaticJsonDocument<192> doc;
      if (deserializeJson(doc, v.c_str(), v.length())) return;
      const char* ssid = doc["ssid"] | "";
      const char* pass = doc["password"] | "";
      if (!ssid[0]) return;
      strlcpy(_um->_pendingSsid, ssid, sizeof(_um->_pendingSsid));
      strlcpy(_um->_pendingPass, pass, sizeof(_um->_pendingPass));
      _um->_credsPending = true;
    }
   private:
    LFBLEProvisioningUsermod* _um;
  };

  void buildIdentity() {
    // Serial derived from the factory MAC: stable, unique, printable.
    // Production boards may instead carry a supplier-programmed serial in NVS.
    uint64_t mac = ESP.getEfuseMac();
    snprintf(_serial, sizeof(_serial), "LF-%04X%08X",
             (uint16_t)(mac >> 32), (uint32_t)mac);

    // Proof-of-possession token, regenerated each boot. The app reads this
    // over BLE (physical proximity) and presents it to POST /devices/claim.
    uint32_t a = esp_random(), b = esp_random();
    snprintf(_claimToken, sizeof(_claimToken), "%08X%08X", a, b);
  }

  void setInfoValue() {
    StaticJsonDocument<192> doc;
    doc["serial"]   = _serial;
    doc["firmware"] = versionString;               // WLED version, e.g. "0.14.4"
    doc["ledCount"] = strip.getLengthTotal();
    doc["zones"]    = busses.getNumBusses();       // wired outputs = app zones
    char buf[192];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    _infoChar->setValue((uint8_t*)buf, n);
  }

  void notifyStatus(const char* status, const char* ipOrError) {
    if (!_statusChar) return;
    StaticJsonDocument<128> doc;
    doc["status"] = status;
    if (strcmp(status, "connected") == 0) doc["ip"] = ipOrError;
    else if (ipOrError && ipOrError[0])   doc["error"] = ipOrError;
    char buf[128];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    _statusChar->setValue((uint8_t*)buf, n);
    _statusChar->notify();
  }

 public:
  void setup() override {
    buildIdentity();

    char devName[24];
    snprintf(devName, sizeof(devName), "LF-Controller-%s", _serial + 3);
    NimBLEDevice::init(devName);
    // Conservative TX power: onboarding happens at arm's length; lower power
    // shrinks the eavesdropping radius for the (spike-only) plaintext creds.
    NimBLEDevice::setPower(ESP_PWR_LVL_N0);

    _server = NimBLEDevice::createServer();
    NimBLEService* svc = _server->createService(LF_BLE_SERVICE_UUID);

    _infoChar   = svc->createCharacteristic(LF_BLE_INFO_CHAR_UUID,
                                            NIMBLE_PROPERTY::READ);
    _credsChar  = svc->createCharacteristic(LF_BLE_CREDS_CHAR_UUID,
                                            NIMBLE_PROPERTY::WRITE);
    _statusChar = svc->createCharacteristic(LF_BLE_STATUS_CHAR_UUID,
                                            NIMBLE_PROPERTY::NOTIFY);
    _claimChar  = svc->createCharacteristic(LF_BLE_CLAIM_CHAR_UUID,
                                            NIMBLE_PROPERTY::READ);

    _credsChar->setCallbacks(new CredsCallbacks(this));

    setInfoValue();
    {
      StaticJsonDocument<64> doc;
      doc["token"] = _claimToken;
      char buf[64];
      size_t n = serializeJson(doc, buf, sizeof(buf));
      _claimChar->setValue((uint8_t*)buf, n);
    }

    svc->start();
    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    adv->addServiceUUID(LF_BLE_SERVICE_UUID);
    adv->setScanResponse(true);
    adv->start();
    _bleStarted = true;

    DEBUG_PRINTF("[LF-BLE] Advertising as %s (serial %s)\n", devName, _serial);
  }

  void loop() override {
    if (!_bleStarted) return;

    // Apply credentials handed over by the BLE callback
    if (_credsPending) {
      _credsPending = false;
      DEBUG_PRINTF("[LF-BLE] Wi-Fi credentials received (ssid: %s)\n", _pendingSsid);
      strlcpy(clientSSID, _pendingSsid, sizeof(clientSSID));
      strlcpy(clientPass, _pendingPass, sizeof(clientPass));
      doSerializeConfig = true;   // persist via WLED's config save
      forceReconnect    = true;   // drop AP/current STA and join the new network
      _provisioning     = true;
      _provisionStart   = millis();
    }

    // Watch for the join result and notify the phone
    if (_provisioning) {
      if (Network.isConnected()) {
        _provisioning = false;
        String ip = Network.localIP().toString();
        DEBUG_PRINTF("[LF-BLE] Joined Wi-Fi, IP %s\n", ip.c_str());
        setInfoValue();  // LED config may have loaded meanwhile
        notifyStatus("connected", ip.c_str());
      } else if (millis() - _provisionStart > LF_BLE_WIFI_TIMEOUT_MS) {
        _provisioning = false;
        DEBUG_PRINTLN("[LF-BLE] Wi-Fi join timed out");
        notifyStatus("failed", "Could not join Wi-Fi (check password)");
      }
    }
  }

  uint16_t getId() override { return 0x4C46; }  // "LF"
};
