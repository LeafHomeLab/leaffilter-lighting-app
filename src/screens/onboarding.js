export function renderOnboarding(container, state, navigate) {
  let step = 0;
  let scanState = 'searching'; // searching | found | failed
  let selectedNetwork = '';
  let zoneNames = ['Front Roofline', 'Garage', 'Peaks', 'Left Side', 'Right Side', 'Backyard'];

  const steps = ['welcome', 'scan', 'found', 'wifi', 'zones', 'test', 'done'];

  const networks = ['LeafFilter_Home', 'NETGEAR_5G', 'Xfinity_WiFi', 'Spectrum_Guest'];

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
      `;

      case 'scan': return `
        <div class="scanning-animation ${scanState === 'searching' ? 'scanning' : ''}">
          ${scanState === 'searching' ? '📡' : scanState === 'found' ? '✅' : '❌'}
        </div>
        <h2 class="onboarding-title" style="font-size: 22px;">
          ${scanState === 'searching' ? 'Searching for Controller' : scanState === 'found' ? 'Controller Here!' : 'Nothing Found'}
        </h2>
        <p class="onboarding-subtitle">
          ${scanState === 'searching'
          ? 'Make sure your LeafFilter controller is powered on and within range.'
          : scanState === 'found'
            ? 'LeafFilter Controller LF-2024 detected on your network.'
            : 'Make sure the controller is powered on, then try again.'}
        </p>
        ${scanState === 'searching' ? `
          <div class="ob-scan-bar"><div class="ob-scan-fill"></div></div>
          <button class="btn btn-ghost ob-cta-secondary" id="ob-manual">Add manually instead</button>
        ` : scanState === 'found' ? `
          <div class="ob-found-card">
            <div class="ob-found-icon">📡</div>
            <div>
              <div class="ob-found-name">LF-2024 Controller</div>
              <div class="ob-found-detail">Serial: LF24-8821-XX · Firmware v2.4.1</div>
            </div>
          </div>
          <button class="btn btn-primary ob-cta" id="ob-next">Connect</button>
        ` : `
          <button class="btn btn-primary ob-cta" id="ob-retry">Try Again</button>
          <button class="btn btn-ghost ob-cta-secondary" id="ob-manual">Add manually</button>
        `}
      `;

      case 'found': return `
        <div class="ob-connecting">
          <div class="ob-connect-ring"></div>
          <div class="ob-connect-icon">🔗</div>
        </div>
        <h2 class="onboarding-title" style="font-size: 22px;">Pairing Controller</h2>
        <p class="onboarding-subtitle">Establishing a secure connection to your LeafFilter system...</p>
        <div class="ob-steps-list">
          <div class="ob-step-item done">
            <div class="ob-step-check">✓</div>
            <span>Controller detected</span>
          </div>
          <div class="ob-step-item done">
            <div class="ob-step-check">✓</div>
            <span>Bluetooth handshake</span>
          </div>
          <div class="ob-step-item active">
            <div class="ob-step-spinner"></div>
            <span>Connecting to network...</span>
          </div>
          <div class="ob-step-item">
            <div class="ob-step-dot"></div>
            <span>Verifying LED chain</span>
          </div>
        </div>
        <button class="btn btn-primary ob-cta" id="ob-next" style="margin-top: 32px;">Continue</button>
      `;

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
        ${selectedNetwork ? `
          <div class="ob-wifi-pass">
            <input type="password" placeholder="Wi-Fi password" class="ob-pass-input" id="wifi-pass" />
          </div>
          <button class="btn btn-primary ob-cta" id="ob-next">Connect</button>
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
            <div class="ob-stat-val">${zoneNames.length}</div>
            <div class="ob-stat-label">Zones</div>
          </div>
          <div class="ob-stat">
            <div class="ob-stat-val">478</div>
            <div class="ob-stat-label">LEDs</div>
          </div>
          <div class="ob-stat">
            <div class="ob-stat-val">v2.4</div>
            <div class="ob-stat-label">Firmware</div>
          </div>
        </div>
        <button class="btn btn-primary ob-cta" id="ob-finish">Start Using Leaf Lighting</button>
      `;
    }
  }

  function attachEvents() {
    container.querySelector('#ob-back')?.addEventListener('click', () => {
      if (step > 0) { step--; render(); }
    });

    container.querySelector('#ob-next')?.addEventListener('click', () => {
      if (steps[step] === 'scan' && scanState !== 'found') return;
      step = Math.min(step + 1, steps.length - 1);
      render();
    });

    container.querySelector('#ob-retry')?.addEventListener('click', () => {
      scanState = 'searching';
      render();
      setTimeout(() => { scanState = 'found'; render(); }, 2500);
    });

    container.querySelector('#ob-skip')?.addEventListener('click', () => {
      localStorage.setItem('lf_onboarded', '1');
      navigate('home');
    });

    container.querySelector('#ob-finish')?.addEventListener('click', () => {
      localStorage.setItem('lf_onboarded', '1');
      navigate('home');
    });

    container.querySelector('#ob-manual')?.addEventListener('click', () => {
      step++;
      render();
    });

    // Auto-advance scan after delay (simulate discovery)
    if (steps[step] === 'scan' && scanState === 'searching') {
      setTimeout(() => {
        if (steps[step] === 'scan') { scanState = 'found'; render(); }
      }, 2500);
    }

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

  render();
}
