export function renderHome(container, state, navigate) {
  const html = `
    <div class="screen" id="screen-home">

      <!-- Logo Header -->
      <div class="home-logo-bar">
        <div class="home-logo">
          <div class="home-logo-icon app-logo-container">
            <img src="/logo.png" alt="LeafFilter" class="app-main-logo" />
          </div>
          <div class="home-logo-text">
            <span class="home-logo-brand">Lighting</span><span class="home-logo-sub">by LeafFilter</span>
          </div>
        </div>
        <div class="chip chip-active home-status-pill">
          <span class="chip-dot online"></span>
          Online
        </div>
      </div>

      <!-- Hero: Power + Scene -->
      <div class="home-hero">
        <div class="power-btn ${state.lightsOn ? 'active' : ''}" id="power-toggle">
          <div class="power-btn-ring"></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M18.36 6.64a9 9 0 11-12.73 0"/>
            <line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
        </div>
        <div class="home-scene-name" id="scene-display">${state.lightsOn ? state.activeScene : 'Lights Off'}</div>
        <div class="home-scene-label">${state.lightsOn ? 'Active Scene' : 'Tap to turn on'}</div>
        <div class="home-schedule-hint">Next: Sunset auto-on · 7:52 PM</div>
      </div>

      <!-- Brightness -->
      <div class="brightness-section">
        <div class="slider-container">
          <div class="slider-label">
            <span>☀️ Brightness</span>
            <span class="slider-value" id="brightness-val">${state.brightness}%</span>
          </div>
          <input type="range" min="0" max="100" value="${state.brightness}" id="brightness-slider" />
        </div>
      </div>

      <!-- Control Banner -->
      <button class="home-control-banner" data-action="control">
        <div class="home-control-banner-left">
          <div class="home-control-banner-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
          </div>
          <div>
            <div class="home-control-banner-title">Control Lights</div>
            <div class="home-control-banner-sub">Color, brightness &amp; effects</div>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- Quick Actions -->
      <div class="quick-actions-row stagger">
        <button class="quick-action" data-action="favorites">
          <div class="quick-action-icon active">⭐</div>
          <span>Favorites</span>
        </button>
        <button class="quick-action" data-action="white">
          <div class="quick-action-icon">☀️</div>
          <span>White</span>
        </button>
        <button class="quick-action" data-action="holiday">
          <div class="quick-action-icon">🎄</div>
          <span>Holiday</span>
        </button>
        <button class="quick-action" data-action="timer">
          <div class="quick-action-icon">⏱️</div>
          <span>Timer</span>
        </button>
        <button class="quick-action" data-action="scenes">
          <div class="quick-action-icon">🎨</div>
          <span>Scenes</span>
        </button>
      </div>

      <!-- House Zone Map -->
      <div class="house-map-section">
        <div class="section-label">Zones</div>
        <div class="house-map-container">
          <svg class="house-svg" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- House body -->
            <rect x="40" y="80" width="240" height="90" rx="4" fill="var(--bg-tertiary)" stroke="var(--border)" stroke-width="1"/>
            <!-- Roof -->
            <polygon points="160,15 30,80 290,80" fill="var(--bg-tertiary)" stroke="var(--border)" stroke-width="1"/>
            <!-- Garage door -->
            <rect x="200" y="110" width="55" height="55" rx="3" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            <!-- Windows -->
            <rect x="65" y="100" width="35" height="28" rx="2" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            <rect x="120" y="100" width="35" height="28" rx="2" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            <!-- Door -->
            <rect x="130" y="130" width="22" height="35" rx="2" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            <!-- Roofline segments (interactive zones) -->
            <polyline class="zone-segment ${state.activeZones.includes('left') ? 'active' : ''}" data-zone="left" points="30,80 95,47"/>
            <polyline class="zone-segment ${state.activeZones.includes('peaks') ? 'active' : ''}" data-zone="peaks" points="95,47 160,15 225,47"/>
            <polyline class="zone-segment ${state.activeZones.includes('right') ? 'active' : ''}" data-zone="right" points="225,47 290,80"/>
            <polyline class="zone-segment ${state.activeZones.includes('front') ? 'active' : ''}" data-zone="front" points="30,80 290,80" stroke-width="4"/>
            <polyline class="zone-segment ${state.activeZones.includes('garage') ? 'active' : ''}" data-zone="garage" points="195,80 195,170 260,170 260,80"/>
            <!-- Zone labels -->
            <text x="55" y="60" fill="var(--text-tertiary)" font-size="8" font-family="Inter">LEFT</text>
            <text x="148" y="38" fill="var(--text-tertiary)" font-size="8" font-family="Inter">PEAKS</text>
            <text x="245" y="60" fill="var(--text-tertiary)" font-size="8" font-family="Inter">RIGHT</text>
            <text x="145" y="76" fill="var(--text-tertiary)" font-size="8" font-family="Inter">FRONT</text>
            <text x="210" y="145" fill="var(--text-tertiary)" font-size="8" font-family="Inter">GARAGE</text>
          </svg>
        </div>
        <!-- Zone Quick Buttons -->
        <div class="zone-quick-grid stagger">
          ${state.allZones.map(z => `
            <button class="zone-quick-btn ${z.active ? 'active' : ''}" data-zone-id="${z.id}">
              <div class="zone-quick-dot"></div>
              ${z.name.split(' ')[0]}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Now Playing -->
      <div class="section-label">Now Playing</div>
      <div class="now-playing">
        <div class="now-playing-header">
          <span class="now-playing-label">● Live</span>
          <div class="now-playing-colors">
            <div class="now-playing-dot" style="background:#FFA852"></div>
            <div class="now-playing-dot" style="background:#FFD4A3"></div>
            <div class="now-playing-dot" style="background:#FFF1E0"></div>
          </div>
        </div>
        <div class="now-playing-scene">${state.activeScene}</div>
        <div class="now-playing-meta">
          <span>Static</span>
          <span>·</span>
          <span>4 zones</span>
          <span>·</span>
          <span>${state.brightness}%</span>
        </div>
        <div class="now-playing-bar animated-gradient">
          <div style="background:#FFA852"></div>
          <div style="background:#FFD4A3"></div>
          <div style="background:#FFF1E0"></div>
          <div style="background:#FFD4A3"></div>
          <div style="background:#FFA852"></div>
        </div>
      </div>

      <!-- Recent Colors -->
      <div class="recent-colors-section">
        <div class="section-label">Recent Colors</div>
        <div class="recent-colors-row">
          ${['#FFA852', '#FF1744', '#4CAF50', '#2196F3', '#E91E63', '#FF6D00', '#AA00FF', '#FFD600', '#00BFA5', '#FFFFFF'].map(c =>
    `<div class="color-swatch" style="background:${c}" data-color="${c}"></div>`
  ).join('')}
        </div>
      </div>

      <!-- Status Footer -->
      <div style="text-align:center; padding: 8px 0 24px;">
        <span style="font-size: var(--fs-caption); color: var(--text-tertiary);">
          Online · Schedule Active · Next: 11:30 PM Off
        </span>
      </div>
    </div>
  `;
  container.innerHTML = html;

  // === Interactions ===
  // Power toggle
  container.querySelector('#power-toggle').addEventListener('click', () => {
    state.lightsOn = !state.lightsOn;
    renderHome(container, state, navigate);
    showToast(state.lightsOn ? 'Lights On' : 'Lights Off');
  });

  // Brightness slider
  const slider = container.querySelector('#brightness-slider');
  const bVal = container.querySelector('#brightness-val');
  slider.addEventListener('input', (e) => {
    state.brightness = parseInt(e.target.value);
    bVal.textContent = state.brightness + '%';
    slider.style.background = `linear-gradient(to right, var(--accent) ${state.brightness}%, var(--bg-quaternary) ${state.brightness}%)`;
  });
  slider.style.background = `linear-gradient(to right, var(--accent) ${state.brightness}%, var(--bg-quaternary) ${state.brightness}%)`;

  // Zone quick buttons
  container.querySelectorAll('.zone-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const zid = btn.dataset.zoneId;
      const zone = state.allZones.find(z => z.id === zid);
      if (zone) {
        zone.active = !zone.active;
        if (zone.active) { state.activeZones.push(zid); } else { state.activeZones = state.activeZones.filter(z => z !== zid); }
        btn.classList.toggle('active', zone.active);
        const seg = container.querySelector(`.zone-segment[data-zone="${zid}"]`);
        if (seg) seg.classList.toggle('active', zone.active);
      }
    });
  });

  // Zone SVG segments
  container.querySelectorAll('.zone-segment').forEach(seg => {
    seg.addEventListener('click', () => {
      const zid = seg.dataset.zone;
      const zone = state.allZones.find(z => z.id === zid);
      if (zone) {
        zone.active = !zone.active;
        if (zone.active) { state.activeZones.push(zid); } else { state.activeZones = state.activeZones.filter(z => z !== zid); }
        seg.classList.toggle('active', zone.active);
        const btn = container.querySelector(`.zone-quick-btn[data-zone-id="${zid}"]`);
        if (btn) btn.classList.toggle('active', zone.active);
      }
    });
  });

  // Control banner
  container.querySelector('[data-action="control"]')?.addEventListener('click', () => navigate('control'));

  // Quick action → screens
  container.querySelector('[data-action="scenes"]')?.addEventListener('click', () => navigate('scenes'));
  container.querySelector('[data-action="favorites"]')?.addEventListener('click', () => navigate('scenes'));
  container.querySelector('[data-action="holiday"]')?.addEventListener('click', () => navigate('scenes'));
  container.querySelector('[data-action="white"]')?.addEventListener('click', () => navigate('control'));
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.getElementById('app-frame').appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
