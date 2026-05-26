export function renderControl(container, state, navigate) {
  const recentColors = ['#FFA852','#FF1744','#4CAF50','#2196F3','#E91E63','#FF6D00','#AA00FF','#FFD600','#00BFA5','#FFFFFF','#FF6B6B','#4ECDC4'];
  const whiteTemps = [
    { label: 'Candle', temp: 1800, color: '#FF9329' },
    { label: 'Warm', temp: 2700, color: '#FFB347' },
    { label: 'Soft', temp: 3000, color: '#FFD580' },
    { label: 'Neutral', temp: 4000, color: '#FFF5CC' },
    { label: 'Cool', temp: 5000, color: '#F0F4FF' },
    { label: 'Daylight', temp: 6500, color: '#B3D4FF' },
  ];

  let selectedHue = 210;
  let selectedSat = 80;
  let brightness = state.brightness ?? 75;
  let speed = 3;
  let drawerTab = 'recent';
  let drawerOpen = false;
  let activeWhiteIdx = 2;

  function getColor() {
    return `hsl(${selectedHue}, ${selectedSat}%, 55%)`;
  }

  function render() {
    const activeZoneNames = state.allZones.filter(z => z.active).map(z => z.name.split(' ')[0]);
    const zoneLabel = activeZoneNames.length === state.allZones.length ? 'All Zones'
      : activeZoneNames.length === 0 ? 'No Zone'
      : activeZoneNames.length === 1 ? activeZoneNames[0]
      : `${activeZoneNames.length} Zones`;

    const currentColor = getColor();

    container.innerHTML = `
      <div class="screen control-screen" id="screen-control">

        <!-- Header -->
        <div class="control-header">
          <div class="control-header-left">
            <div class="control-title">Control Lights</div>
            <div class="control-zone-label">${zoneLabel} · ${state.allZones.filter(z => z.active).reduce((a,z) => a + z.leds, 0)} LEDs</div>
          </div>
          <button class="control-power-btn ${state.lightsOn ? 'on' : ''}" id="ctrl-power">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
          </button>
        </div>

        <!-- Zone chips -->
        <div class="control-zones-row">
          <button class="ctrl-zone-chip ${state.activeZones.length === state.allZones.length ? 'active' : ''}" data-zone-action="all">All</button>
          ${state.allZones.map(z => `
            <button class="ctrl-zone-chip ${z.active ? 'active' : ''}" data-zone-id="${z.id}">${z.name.split(' ')[0]}</button>
          `).join('')}
        </div>

        <!-- Color Wheel -->
        <div class="color-wheel-wrap">
          <div class="color-wheel-glow" style="background: radial-gradient(circle, ${currentColor}44 0%, transparent 70%);"></div>
          <canvas class="color-wheel-canvas" id="ctrl-wheel" width="260" height="260"></canvas>
          <div class="color-wheel-selector" id="ctrl-selector"></div>
          <div class="color-wheel-center" style="background: ${state.lightsOn ? currentColor : '#1a1a2e'}; box-shadow: ${state.lightsOn ? `0 0 20px ${currentColor}88` : 'none'};"></div>
        </div>

        <!-- Sliders -->
        <div class="control-sliders">
          <div class="ctrl-slider-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <input type="range" class="ctrl-range" id="ctrl-brightness" min="0" max="100" value="${brightness}" />
            <span class="ctrl-range-val" id="brightness-val">${brightness}%</span>
          </div>
          <div class="ctrl-slider-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <input type="range" class="ctrl-range" id="ctrl-speed" min="0" max="10" value="${speed}" />
            <span class="ctrl-range-val" id="speed-val">${speed === 0 ? 'Static' : speed}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="control-actions">
          <button class="btn btn-primary" id="ctrl-apply" style="flex:1;">Set Lights</button>
          <button class="btn btn-secondary" id="ctrl-save" style="flex:1;">Save Scene</button>
        </div>

        <!-- Bottom Drawer -->
        <div class="ctrl-drawer ${drawerOpen ? 'open' : ''}" id="ctrl-drawer">
          <div class="ctrl-drawer-handle" id="ctrl-drawer-handle"></div>
          <div class="ctrl-drawer-tabs">
            <button class="ctrl-tab ${drawerTab === 'recent' ? 'active' : ''}" data-tab="recent">Recent</button>
            <button class="ctrl-tab ${drawerTab === 'white' ? 'active' : ''}" data-tab="white">White</button>
            <button class="ctrl-tab ${drawerTab === 'preset' ? 'active' : ''}" data-tab="preset">Presets</button>
            <button class="ctrl-tab ${drawerTab === 'rgb' ? 'active' : ''}" data-tab="rgb">RGB</button>
          </div>
          <div class="ctrl-drawer-content">
            ${drawerTab === 'recent' ? `
              <div class="ctrl-color-grid">
                ${recentColors.map(c => `<button class="ctrl-color-swatch" style="background:${c};" data-color="${c}"></button>`).join('')}
              </div>
            ` : ''}
            ${drawerTab === 'white' ? `
              <div class="ctrl-white-grid">
                ${whiteTemps.map((w, i) => `
                  <button class="ctrl-white-btn ${i === activeWhiteIdx ? 'active' : ''}" data-white="${i}" style="--wc:${w.color}">
                    <div class="ctrl-white-dot" style="background:${w.color};"></div>
                    <div class="ctrl-white-label">${w.label}</div>
                    <div class="ctrl-white-temp">${w.temp}K</div>
                  </button>
                `).join('')}
              </div>
            ` : ''}
            ${drawerTab === 'preset' ? `
              <div class="ctrl-preset-list">
                ${[{name:'Chase',icon:'⚡'},{name:'Twinkle',icon:'✨'},{name:'Wave',icon:'🌊'},{name:'Fade',icon:'🌫️'},{name:'Meteor',icon:'☄️'},{name:'Pulse',icon:'💓'},{name:'Static',icon:'■'},{name:'Bounce',icon:'↕'}].map(p => `
                  <button class="ctrl-preset-chip" data-preset="${p.name}">${p.icon} ${p.name}</button>
                `).join('')}
              </div>
            ` : ''}
            ${drawerTab === 'rgb' ? `
              <div class="ctrl-rgb-inputs">
                <div class="ctrl-rgb-preview" style="background:${currentColor};"></div>
                <div class="ctrl-rgb-row">
                  <label>H</label>
                  <input type="range" class="ctrl-range-rgb" id="rgb-h" min="0" max="360" value="${selectedHue}" />
                  <span>${Math.round(selectedHue)}</span>
                </div>
                <div class="ctrl-rgb-row">
                  <label>S</label>
                  <input type="range" class="ctrl-range-rgb" id="rgb-s" min="0" max="100" value="${selectedSat}" />
                  <span>${Math.round(selectedSat)}%</span>
                </div>
                <div class="ctrl-rgb-hex">
                  <span class="ctrl-rgb-hex-label">#</span>
                  <input type="text" class="ctrl-rgb-hex-input" id="rgb-hex" value="${hslToHex(selectedHue, selectedSat, 55)}" maxlength="6" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

      </div>
    `;

    drawColorWheel();
    updateSelectorPosition();
    attachEvents();
  }

  function drawColorWheel() {
    const canvas = container.querySelector('#ctrl-wheel');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 8;

    // Hue ring
    for (let angle = 0; angle < 360; angle++) {
      const start = (angle - 1) * Math.PI / 180;
      const end = (angle + 1) * Math.PI / 180;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `hsla(${angle}, 0%, 100%, 1)`);
      grad.addColorStop(0.5, `hsla(${angle}, 100%, 55%, 1)`);
      grad.addColorStop(1, `hsla(${angle}, 100%, 20%, 1)`);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // White center fade
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.55);
    centerGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
    centerGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = centerGrad;
    ctx.fill();

    // Center hole
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw properly: hue outer ring, white fade overlay
    for (let angle = 0; angle < 360; angle++) {
      const startA = (angle - 0.9) * Math.PI / 180;
      const endA = (angle + 0.9) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startA, endA);
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    // Saturation overlay: white in center
    const satGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    satGrad.addColorStop(0, 'rgba(255,255,255,1)');
    satGrad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    satGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = satGrad;
    ctx.fill();

    // Darkness overlay: dark at edges
    const darkGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius);
    darkGrad.addColorStop(0, 'rgba(0,0,0,0)');
    darkGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = darkGrad;
    ctx.fill();

    // Clear center for the center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fillStyle = 'transparent';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function updateSelectorPosition() {
    const canvas = container.querySelector('#ctrl-wheel');
    const selector = container.querySelector('#ctrl-selector');
    if (!canvas || !selector) return;
    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 8;
    const maxDist = radius - 12;
    const dist = (selectedSat / 100) * maxDist;
    const angle = selectedHue * Math.PI / 180;
    const x = cx + dist * Math.cos(angle);
    const y = cy + dist * Math.sin(angle);
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    selector.style.left = (x * scaleX) + 'px';
    selector.style.top = (y * scaleY) + 'px';
    selector.style.background = getColor();
  }

  function pickColorFromCanvas(e) {
    const canvas = container.querySelector('#ctrl-wheel');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 8;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;
    selectedHue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
    selectedSat = Math.min((dist / (radius - 12)) * 100, 100);
    updateSelectorPosition();
    // Update center dot and glow
    const centerDot = container.querySelector('.color-wheel-center');
    const glow = container.querySelector('.color-wheel-glow');
    const c = getColor();
    if (centerDot) { centerDot.style.background = c; centerDot.style.boxShadow = `0 0 20px ${c}88`; }
    if (glow) glow.style.background = `radial-gradient(circle, ${c}44 0%, transparent 70%)`;
  }

  function attachEvents() {
    // Power toggle
    container.querySelector('#ctrl-power')?.addEventListener('click', () => {
      state.lightsOn = !state.lightsOn;
      render();
    });

    // Color wheel interaction
    const canvas = container.querySelector('#ctrl-wheel');
    if (canvas) {
      canvas.addEventListener('mousedown', e => {
        pickColorFromCanvas(e);
        const onMove = e2 => pickColorFromCanvas(e2);
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      canvas.addEventListener('touchstart', e => { e.preventDefault(); pickColorFromCanvas(e); }, { passive: false });
      canvas.addEventListener('touchmove', e => { e.preventDefault(); pickColorFromCanvas(e); }, { passive: false });
    }

    // Zone chips
    container.querySelector('[data-zone-action="all"]')?.addEventListener('click', () => {
      const allActive = state.activeZones.length === state.allZones.length;
      state.allZones.forEach(z => z.active = !allActive);
      state.activeZones = allActive ? [] : state.allZones.map(z => z.id);
      render();
    });
    container.querySelectorAll('[data-zone-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const zid = btn.dataset.zoneId;
        const zone = state.allZones.find(z => z.id === zid);
        if (zone) {
          zone.active = !zone.active;
          state.activeZones = zone.active
            ? [...state.activeZones, zid]
            : state.activeZones.filter(id => id !== zid);
          render();
        }
      });
    });

    // Brightness
    container.querySelector('#ctrl-brightness')?.addEventListener('input', e => {
      brightness = parseInt(e.target.value);
      state.brightness = brightness;
      const v = container.querySelector('#brightness-val');
      if (v) v.textContent = brightness + '%';
      updateRangeTrack(e.target, brightness, 100);
    });
    updateRangeTrack(container.querySelector('#ctrl-brightness'), brightness, 100);

    // Speed
    container.querySelector('#ctrl-speed')?.addEventListener('input', e => {
      speed = parseInt(e.target.value);
      const v = container.querySelector('#speed-val');
      if (v) v.textContent = speed === 0 ? 'Static' : speed;
      updateRangeTrack(e.target, speed, 10);
    });
    updateRangeTrack(container.querySelector('#ctrl-speed'), speed, 10);

    // Apply / Save
    container.querySelector('#ctrl-apply')?.addEventListener('click', () => {
      state.lightsOn = true;
      showToast('Lights updated');
    });
    container.querySelector('#ctrl-save')?.addEventListener('click', () => showToast('Saved as new scene'));

    // Drawer toggle
    container.querySelector('#ctrl-drawer-handle')?.addEventListener('click', () => {
      drawerOpen = !drawerOpen;
      container.querySelector('#ctrl-drawer')?.classList.toggle('open', drawerOpen);
    });

    // Drawer tabs
    container.querySelectorAll('.ctrl-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        drawerTab = tab.dataset.tab;
        drawerOpen = true;
        render();
      });
    });

    // Recent color swatches
    container.querySelectorAll('.ctrl-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const hex = sw.dataset.color;
        const { h, s } = hexToHsl(hex);
        selectedHue = h;
        selectedSat = s;
        updateSelectorPosition();
        const c = getColor();
        const centerDot = container.querySelector('.color-wheel-center');
        const glow = container.querySelector('.color-wheel-glow');
        if (centerDot) { centerDot.style.background = c; centerDot.style.boxShadow = `0 0 20px ${c}88`; }
        if (glow) glow.style.background = `radial-gradient(circle, ${c}44 0%, transparent 70%)`;
        container.querySelectorAll('.ctrl-color-swatch').forEach(s2 => s2.classList.remove('selected'));
        sw.classList.add('selected');
      });
    });

    // White temps
    container.querySelectorAll('.ctrl-white-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeWhiteIdx = parseInt(btn.dataset.white);
        container.querySelectorAll('.ctrl-white-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const temp = whiteTemps[activeWhiteIdx];
        const { h, s } = hexToHsl(temp.color);
        selectedHue = h;
        selectedSat = s;
        updateSelectorPosition();
      });
    });

    // HSL sliders (RGB tab)
    container.querySelector('#rgb-h')?.addEventListener('input', e => {
      selectedHue = parseInt(e.target.value);
      e.target.nextElementSibling.textContent = Math.round(selectedHue);
      updateSelectorPosition();
    });
    container.querySelector('#rgb-s')?.addEventListener('input', e => {
      selectedSat = parseInt(e.target.value);
      e.target.nextElementSibling.textContent = Math.round(selectedSat) + '%';
      updateSelectorPosition();
    });
  }

  render();
}

function updateRangeTrack(input, val, max) {
  if (!input) return;
  const pct = (val / max) * 100;
  input.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--bg-quaternary) ${pct}%)`;
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); };
  return `${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.getElementById('app-frame').appendChild(toast); }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
