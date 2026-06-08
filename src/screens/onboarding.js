import * as ble from '../ble.js';
import { connect, setHubAddress } from '../api.js';

export function renderOnboarding(container, state, navigate) {
  let step = 0;
  let scanState = 'searching'; // searching | found | failed
  let selectedNetwork = '';
  let zoneNames = ['Front Roofline', 'Garage', 'Peaks', 'Left Side', 'Right Side', 'Backyard'];
  let zoneLeds = zoneNames.map((_, i) => [148, 52, 36, 64][i] ?? 36);

  const steps = ['welcome', 'scan', 'found', 'wifi', 'zones', 'test', 'done'];

  const networks = ['LeafFilter_Home', 'NETGEAR_5G', 'Xfinity_WiFi', 'Spectrum_Guest'];

  // ── BLE state (populated during scan/pair) ──
  let discoveredDevices = [];
  let pairedDevice = null;   // { deviceId, name, rssi }
  let deviceInfo = null;     // { serial, firmware, ledCount, zones }
  let provisionedIp = null;  // e.g. '192.168.1.42'
  let wifiError = null;

  // ── Pairing step state ──
  // Guard: prevents re-entering startBlePairing() on every render() call
  let pairingStarted = false;
  let pairingComplete = false;
  let pairStepStates = {
    detected: 'done',
    bluetooth: 'pending',
    network: 'pending',
    leds: 'pending',
  };

  // Initialize BLE on module load (non-blocking)
  ble.init();

  function render() {
    container.innerHTML = `
      <div class="onboarding-screen" id="screen-onboarding">
        ${step > 0 && step < 6 ? `
          <button class="ob-back" id="ob-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        ` : ''}

        <!-- Step dots -->
        ${step > 0 && step < 6 ? `
          <div class="onboarding-dots" style="margin-bottom: 32px;">
            ${steps.slice(1, 6).map((_, i) => `
              <div class="onboarding-dot ${i + 1 <= step ? 'active' : ''}"></div>
            `).join('')}
          </div>
        ` : ''}

        ${renderStep()}
      </div>
    `;
    attachEvents();
  }

  function renderStep() {
    switch (steps[step]) {
      case 'welcome': return `
        <div class="ob-hero-glow"></div>
        <div class="ob-logo-mark">
          <img src="/logo.png" alt="LeafFilter" class="ob-logo-img" />
        </div>
        <div class="ob-wordmark">
          <img src="/leaffilter-logo.svg" alt="Lighting by LeafFilter" class="ob-wordmark-svg" />
        </div>
        <p class="onboarding-subtitle">Premium roofline lighting — right at your fingertips. Let's get your system set up.</p>
        <button class="btn btn-primary ob-cta" id="ob-next">Get Started</button>
        <button class="btn btn-ghost ob-cta-secondary" id="ob-skip">Already have an account?  Sign In</button>
        ${import.meta.env?.DEV ? `<button class="btn btn-ghost ob-cta-secondary" id="ob-dev-skip" style="opacity:0.45;font-size:12px;margin-top:8px;">Dev: Skip to App →</button>` : ''}
      `;

      case 'scan': return `
        <div class="scanning-animation ${scanState === 'searching' ? 'scanning' : ''}">
          ${scanState === 'searching' ? '📡' : scanState === 'found' ? '✅' : '❌'}
        </div>
        <h2 class="onboarding-title" style="font-size: 22px;">
          ${scanState === 'searching' ? 'Looking for Your Controller' : scanState === 'found' ? 'Controller Found!' : 'Nothing Nearby'}
        </h2>
        <p class="onboarding-subtitle">
          ${scanState === 'searching'
          ? 'Make sure your LeafFilter controller is powered on and within range.'
          : scanState === 'found'
            ? `LeafFilter Controller ${pairedDevice?.name || 'LF-2024'} detected${ble.BLE_AVAILABLE ? ' via Bluetooth' : ' on your network'}.`
            : "We couldn't find a controller. Make sure it's powered on and close by, then try again."}
        </p>
        ${scanState === 'searching' ? `
          <div class="ob-scan-bar"><div class="ob-scan-fill"></div></div>
          <button class="btn btn-ghost ob-cta-secondary" id="ob-manual">Set up manually instead</button>
        ` : scanState === 'found' ? `
          <div class="ob-found-card">
            <div class="ob-found-icon">📡</div>
            <div>
              <div class="ob-found-name">${pairedDevice?.name || 'LF-2024 Controller'}</div>
              <div class="ob-found-detail">Serial: ${deviceInfo?.serial || 'LF24-8821-XX'} · Firmware v${deviceInfo?.firmware || '2.4.1'}</div>
            </div>
          </div>
          <button class="btn btn-primary ob-cta" id="ob-next">Connect</button>
        ` : `
          <button class="btn btn-primary ob-cta" id="ob-retry">Try Again</button>
          <button class="btn btn-ghost ob-cta-secondary" id="ob-manual">Set up manually instead</button>
        `}
      `;

      case 'found': {
        const stepClass = (key) => {
          if (pairStepStates[key] === 'done') return 'done';
          if (pairStepStates[key] === 'active') return 'active';
          return '';
        };
        const stepIcon = (key) => {
          if (pairStepStates[key] === 'done') return '<div class="ob-step-check">✓</div>';
          if (pairStepStates[key] === 'active') return '<div class="ob-step-spinner"></div>';
          return '<div class="ob-step-dot"></div>';
        };
        return `
          <div class="ob-connecting">
            <div class="ob-connect-ring"></div>
            <div class="ob-connect-icon">🔗</div>
          </div>
          <h2 class="onboarding-title" style="font-size: 22px;">Setting Up Your System</h2>
          <p class="onboarding-subtitle">${pairingComplete ? 'Your controller is connected and ready.' : 'Just a moment while we get everything ready...'}</p>
          <div class="ob-steps-list">
            <div class="ob-step-item ${stepClass('detected')}">
              ${stepIcon('detected')}
              <span>Controller found</span>
            </div>
            <div class="ob-step-item ${stepClass('bluetooth')}">
              ${stepIcon('bluetooth')}
              <span>Securing connection</span>
            </div>
            <div class="ob-step-item ${stepClass('network')}">
              ${stepIcon('network')}
              <span>Joining your Wi-Fi</span>
            </div>
            <div class="ob-step-item ${stepClass('leds')}">
              ${stepIcon('leds')}
              <span>Discovering your lights</span>
            </div>
          </div>
          <button
            class="btn btn-primary ob-cta"
            id="ob-next"
            style="margin-top: 32px;${!pairingComplete ? 'opacity:0.35;pointer-events:none;' : ''}"
            ${!pairingComplete ? 'disabled aria-disabled="true"' : ''}
          >Continue</button>
        `;
      }

      case 'wifi': return `
        <div style="font-size: 48px; margin-bottom: 16px;">📶</div>
        <h2 class="onboarding-title" style="font-size: 22px;">Connect to Wi-Fi</h2>
        <p class="onboarding-subtitle">Select your home network so we can enable remote control and scheduling.</p>
        <div class="ob-network-list">
          ${networks.map(n => `
            <button class="ob-network-item ${selectedNetwork === n ? 'selected' : ''}" data-network="${n}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M10.12 16.11A4 4 0 0114 16"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              <span>${n}</span>
              ${selectedNetwork === n ? '<div class="ob-network-check">✓</div>' : ''}
            </button>
          `).join('')}
        </div>
        ${selectedNetwork && !wifiError ? `
          <div class="ob-wifi-pass">
            <input type="password" placeholder="Wi-Fi password" class="ob-pass-input" id="wifi-pass" />
          </div>
          <button class="btn btn-primary ob-cta" id="ob-wifi-connect">Connect</button>
        ` : ''}
        ${wifiError ? `
          <p style="color:var(--error,#ff4d4d);font-size:14px;margin-top:12px;text-align:center;">${wifiError}</p>
          <button class="btn btn-primary ob-cta" id="ob-wifi-retry">Try Again</button>
          <button class="btn btn-ghost ob-cta-secondary" id="ob-wifi-demo">Continue in demo mode</button>
        ` : ''}
      `;

      case 'zones': return `
        <div style="font-size: 48px; margin-bottom: 16px;">🏠</div>
        <h2 class="onboarding-title" style="font-size: 22px;">Name Your Zones</h2>
        <p class="onboarding-subtitle">We detected ${zoneNames.length} zones. Give them names that make sense for your home.</p>
        <div class="ob-zones-list">
          ${zoneNames.map((name, i) => `
            <div class="ob-zone-row">
              <div class="ob-zone-num">${i + 1}</div>
              <input type="text" class="ob-zone-input" value="${name}" data-zone="${i}" />
              <input type="number" class="ob-zone-leds" value="${zoneLeds[i] ?? 36}" min="1" max="600" data-zone="${i}" style="width:64px;" />
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary ob-cta" id="ob-next">Save & Continue</button>
      `;

      case 'test': return `
        <div style="font-size: 48px; margin-bottom: 16px;">💡</div>
        <h2 class="onboarding-title" style="font-size: 22px;">Test Your Lights</h2>
        <p class="onboarding-subtitle">Tap each zone to confirm your LEDs are wired correctly.</p>
        <div class="ob-test-zones">
          ${zoneNames.map((name, i) => `
            <button class="ob-test-btn" data-test="${i}">
              <div class="ob-test-icon" id="test-icon-${i}">○</div>
              <span>${name}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-secondary ob-cta" id="ob-test-all">Flash All Zones</button>
        <button class="btn btn-primary ob-cta" id="ob-next">Looks Good</button>
      `;

      case 'done': return `
        <div class="ob-done-glow"></div>
        <div class="ob-done-check">✓</div>
        <h2 class="onboarding-title">You're all set!</h2>
        <p class="onboarding-subtitle">Your LeafFilter lighting system is connected and ready. Control your roofline from anywhere.</p>
        <div class="ob-done-stats">
          <div class="ob-stat">
            <div class="ob-stat-val">${deviceInfo?.zones ?? zoneNames.length}</div>
            <div class="ob-stat-label">Zones</div>
          </div>
          <div class="ob-stat">
            <div class="ob-stat-val">${deviceInfo?.ledCount ?? 478}</div>
            <div class="ob-stat-label">LEDs</div>
          </div>
          <div class="ob-stat">
            <div class="ob-stat-val">v${deviceInfo?.firmware ?? '2.4'}</div>
            <div class="ob-stat-label">Firmware</div>
          </div>
        </div>
        <button class="btn btn-primary ob-cta" id="ob-finish">Start Using Leaf Lighting</button>
      `;
    }
  }

  function attachEvents() {
    container.querySelector('#ob-back')?.addEventListener('click', () => {
      if (step > 0) {
        // Leaving the found step resets pairing so it can re-run if they return
        if (steps[step] === 'found') {
          pairingStarted = false;
          pairingComplete = false;
          pairStepStates = { detected: 'done', bluetooth: 'pending', network: 'pending', leds: 'pending' };
        }
        step--;
        render();
      }
    });

    container.querySelector('#ob-next')?.addEventListener('click', () => {
      if (steps[step] === 'scan' && scanState !== 'found') return;
      if (steps[step] === 'found' && !pairingComplete) return;
      step = Math.min(step + 1, steps.length - 1);
      render();
    });

    container.querySelector('#ob-retry')?.addEventListener('click', () => {
      scanState = 'searching';
      render();
      startBleScan();
    });

    container.querySelector('#ob-skip')?.addEventListener('click', () => {
      localStorage.setItem('lf_onboarded', '1');
      navigate('home');
    });

    container.querySelector('#ob-dev-skip')?.addEventListener('click', () => {
      localStorage.setItem('lf_onboarded', '1');
      navigate('home');
    });

    container.querySelector('#ob-finish')?.addEventListener('click', async () => {
      await ble.disconnect();

      const zones = state.controllers?.[0]?.zones;
      if (zones) {
        zoneNames.forEach((name, i) => {
          if (zones[i]) {
            zones[i].name = name;
            zones[i].leds = zoneLeds[i] ?? 36;
          }
        });
      }
      if (state.controllers?.[0] && provisionedIp) {
        state.controllers[0].ip = provisionedIp;
      }
      window.dispatchEvent(new CustomEvent('lf:save-state'));

      localStorage.setItem('lf_onboarded', '1');
      navigate('home');
    });

    // "Set up manually" skips the pairing step entirely and goes to Wi-Fi entry
    container.querySelector('#ob-manual')?.addEventListener('click', () => {
      step = steps.indexOf('wifi');
      render();
    });

    // ── BLE: Auto-start scan when entering the scan step ──
    if (steps[step] === 'scan' && scanState === 'searching') {
      startBleScan();
    }

    // ── BLE: Auto-start pairing once when entering the found step ──
    if (steps[step] === 'found' && !pairingStarted) {
      pairingStarted = true;
      startBlePairing();
    }

    // ── Wi-Fi provisioning button ──
    container.querySelector('#ob-wifi-connect')?.addEventListener('click', () => {
      const passInput = container.querySelector('#wifi-pass');
      const password = passInput?.value || '';
      startWifiProvisioning(selectedNetwork, password);
    });

    // Network selection
    container.querySelectorAll('.ob-network-item').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedNetwork = btn.dataset.network;
        render();
      });
    });

    // Zone name inputs
    container.querySelectorAll('.ob-zone-input').forEach(input => {
      input.addEventListener('change', e => {
        zoneNames[parseInt(input.dataset.zone)] = e.target.value;
      });
    });

    // Zone LED count inputs
    container.querySelectorAll('.ob-zone-leds').forEach(input => {
      input.addEventListener('change', e => {
        zoneLeds[parseInt(input.dataset.zone)] = parseInt(e.target.value) || 36;
      });
    });

    // Wi-Fi error recovery buttons
    container.querySelector('#ob-wifi-retry')?.addEventListener('click', () => {
      wifiError = null;
      render();
    });

    container.querySelector('#ob-wifi-demo')?.addEventListener('click', () => {
      wifiError = null;
      step++;
      render();
    });

    // Test zone buttons
    container.querySelectorAll('.ob-test-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const icon = container.querySelector(`#test-icon-${btn.dataset.test}`);
        if (icon) { icon.textContent = '💡'; icon.style.filter = 'drop-shadow(0 0 8px #FFA852)'; }
        setTimeout(() => { if (icon) { icon.textContent = '✓'; icon.style.filter = ''; icon.style.color = 'var(--accent)'; } }, 800);
      });
    });

    container.querySelector('#ob-test-all')?.addEventListener('click', () => {
      container.querySelectorAll('.ob-test-icon').forEach((icon, i) => {
        setTimeout(() => { icon.textContent = '💡'; icon.style.filter = 'drop-shadow(0 0 8px #FFA852)'; }, i * 200);
        setTimeout(() => { icon.textContent = '✓'; icon.style.filter = ''; icon.style.color = 'var(--accent)'; }, i * 200 + 800);
      });
    });
  }

  // ─── BLE Workflows ──────────────────────────────────────────────────────────

  async function startBleScan() {
    try {
      discoveredDevices = await ble.scanForControllers(8000);
      if (discoveredDevices.length > 0) {
        pairedDevice = discoveredDevices[0];
        deviceInfo = await ble.pairController(pairedDevice.deviceId);
        scanState = 'found';
      } else {
        scanState = 'failed';
      }
    } catch (err) {
      console.error('[Onboarding] BLE scan failed:', err);
      scanState = 'failed';
    }
    if (steps[step] === 'scan') {
      render();
    }
  }

  /**
   * Animates the pairing checklist. Called exactly once when entering the found step.
   * Uses pairingStarted flag to prevent re-entry on every render() call.
   */
  async function startBlePairing() {
    pairStepStates.detected = 'done';
    pairStepStates.bluetooth = 'active';
    if (steps[step] === 'found') render();

    await delay(800);
    pairStepStates.bluetooth = 'done';
    pairStepStates.network = 'active';
    if (steps[step] === 'found') render();

    await delay(1200);
    pairStepStates.network = 'done';
    pairStepStates.leds = 'active';
    if (steps[step] === 'found') render();

    await delay(700);
    pairStepStates.leds = 'done';
    pairingComplete = true;
    if (steps[step] === 'found') render();
  }

  async function startWifiProvisioning(ssid, password) {
    if (!pairedDevice) {
      step++;
      render();
      return;
    }

    const btn = container.querySelector('#ob-wifi-connect');
    if (btn) {
      btn.textContent = 'Connecting...';
      btn.disabled = true;
    }

    try {
      const result = await ble.provisionWifi(pairedDevice.deviceId, ssid, password);

      if (result.success && result.ip) {
        provisionedIp = result.ip;
        setHubAddress(result.ip);
        const connResult = await connect(result.ip);
        console.log('[Onboarding] HTTP connection result:', connResult);
        wifiError = null;
        step++;
        render();
      } else {
        wifiError = result.error || 'Could not connect to Wi-Fi. Please check your password and try again.';
        render();
      }
    } catch (err) {
      console.error('[Onboarding] Wi-Fi provisioning error:', err);
      wifiError = 'Could not connect to Wi-Fi. Please check your password and try again.';
      render();
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  render();
}
