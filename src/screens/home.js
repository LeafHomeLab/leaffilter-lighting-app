import { hslToHex, hexToHsl, whiteTempToColor, showToast, syncFabColor, PATTERN_COLOR_LIGHTNESS } from '../utils.js';
import { scenes } from '../data/scenes.js';
import * as api from '../api.js';

export function renderHome(container, state, navigate) {
  const recentColors = [
    '#FF1493', '#FF69B4', '#ADFF2F', '#1E90FF', '#DA70D6', '#9B59B6', '#FF4500', '#2ECC71',
    '#00FF7F', '#F0F0F0', '#FF8C00', '#FFD700', '#E74C3C', '#8B00FF', '#FF6347', '#00BCD4'
  ];
  const whiteColors = [
    '#FF9329', '#FFB347', '#FFD580', '#FFF5E0', '#FFFFF0', '#F5F0FF',
    '#FFAD5C', '#FFCC80', '#FFF8DC', '#FFFAFA', '#E8F0FF', '#90B8FF'
  ];

  const movements = ['Stationary', 'Chase', 'Twinkle', 'Wave', 'Fade', 'Meteor', 'Pulse', 'Bounce'];

  const colorPresets = [
    { name: 'Sunset', colors: ['#FF4500', '#FFD700'] },
    { name: 'Ocean', colors: ['#006994', '#40E0D0'] },
    { name: 'Forest', colors: ['#228B22', '#90EE90'] },
    { name: 'Candy', colors: ['#FF1493', '#DA70D6'] },
    { name: 'Arctic', colors: ['#87CEEB', '#E0F0FF'] },
    { name: 'Fire', colors: ['#CC0000', '#FF8C00'] },
    { name: 'Lavender', colors: ['#6A0DAD', '#DA70D6'] },
    { name: 'Mint', colors: ['#00CED1', '#7FFFD4'] },
  ];

  let selectedHue = 0;
  let selectedSat = 90;
  let brightness = state.brightness ?? 75;
  let whiteTemp = 50;
  let activeTab = 'recent';
  let patternCount = 1;
  let patternColors = ['#' + hslToHex(selectedHue, selectedSat, PATTERN_COLOR_LIGHTNESS)];
  let activeDotIdx = 0;
  let selectedMovement = state.selectedMovement ?? 'Stationary';

  function getTempValue(val) {
    const temp = Math.round((1800 + (val / 100) * (6500 - 1800)) / 100) * 100;
    return `${temp}K`;
  }

  function getColor() {
    return `hsl(${selectedHue}, ${selectedSat}%, ${PATTERN_COLOR_LIGHTNESS}%)`;
  }

  function updateActiveDotColor() {
    // Store the color at full brightness (L=55) as the source of truth
    const fullHex = '#' + hslToHex(selectedHue, selectedSat, PATTERN_COLOR_LIGHTNESS);
    patternColors[activeDotIdx] = fullHex;
    refreshDotDisplays();
  }

  // Update ALL pattern dots to reflect current brightness level
  function refreshDotDisplays() {
    const displayL = 5 + (brightness / 100) * 50; // 0% → near-black, 100% → L55
    const dots = container.querySelectorAll('.hm-pattern-dot');
    dots.forEach((dot, i) => {
      const { h, s } = hexToHsl(patternColors[i]);
      const displayHex = '#' + hslToHex(h, s, displayL);
      dot.style.background = displayHex;
      dot.style.boxShadow = `0 0 8px ${displayHex}88`;
    });
  }

  // Interpolate the white-temperature gradient to get a hex color
  function render() {
    const activeZoneNames = state.allZones.filter(z => z.active).map(z => z.name);
    const zoneLabel = activeZoneNames.length === 0 ? 'NONE'
      : activeZoneNames.length === 1 ? activeZoneNames[0].toUpperCase()
        : `${activeZoneNames[0].toUpperCase()} +${activeZoneNames.length - 1}`;
    const showColorGrid = activeTab === 'recent' || activeTab === 'whites' || activeTab === 'preset';
    const tabColors = activeTab === 'whites' ? whiteColors
      : activeTab === 'preset' ? colorPresets.flatMap(p => p.colors)
        : (state.recentColors ?? recentColors);

    container.innerHTML = `
      <div class="screen hm-screen" id="screen-home">

        <!-- Header -->
        <div class="hm-header">
          <div class="home-logo">
            <div class="home-logo-icon app-logo-container">
              <img src="/logo.png" alt="LeafFilter" class="app-main-logo" />
            </div>
            <div class="home-logo-text">
              <span class="home-logo-brand">Lighting</span><span class="home-logo-sub"> by LeafFilter</span>
            </div>
          </div>
          <div class="hm-header-right">
            <button class="hm-zone-btn" id="hm-zone-btn">SELECT ZONES</button>
            <button class="hm-settings-btn" id="hm-settings-btn" aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </button>
          </div>
        </div>

        <div class="hm-divider"></div>

        <!-- Pattern LED row -->
        <div class="hm-pattern-row">
          <div class="hm-pattern-left">
            <span class="hm-pattern-count">Repeat every ${patternCount} LED${patternCount > 1 ? 's' : ''}</span>
            <div class="hm-pattern-dots">
              ${patternColors.map((c, i) =>
      `<div class="hm-pattern-dot${i === activeDotIdx ? ' active' : ''}" data-dot-idx="${i}" style="background:${c};box-shadow:0 0 8px ${c}88;"></div>`
    ).join('')}
            </div>
          </div>
          <div class="hm-pattern-btns">
            <button class="hm-pattern-adj" id="pattern-minus">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="hm-pattern-adj" id="pattern-plus">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        <div class="hm-divider"></div>

        <!-- Zone/Movement info -->
        <div class="hm-zone-info">
          <span class="hm-info-label">ZONES:</span>
          <span class="hm-info-val">${zoneLabel}</span>
          <span class="hm-info-sep">·</span>
          <span class="hm-info-label">MOVEMENT:</span>
          <span class="hm-info-val">${selectedMovement.toUpperCase()}</span>
        </div>

        <!-- Wheel area: vertical brightness slider + color wheel -->
        <div class="hm-wheel-area">
          <div class="vert-bright-wrap">
            <div class="vert-bright-track" id="bright-track">
              <div class="vert-bright-thumb" id="bright-thumb"></div>
            </div>
          </div>
          <div class="hm-canvas-wrap" id="hm-canvas-wrap">
            <canvas class="hm-canvas" id="home-wheel" width="260" height="260"></canvas>
            <div class="hm-selector" id="home-selector"></div>
          </div>
        </div>

        <!-- White Temp slider -->
        <div class="hm-white-temp-section">
          <div class="hm-temp-header">
            <span class="hm-temp-title">Color Temperature</span>
            <span class="hm-temp-badge" id="temp-label">${getTempValue(whiteTemp)}</span>
          </div>
          <div class="hm-temp-row">
            <span class="hm-temp-end-label">Warm</span>
            <input type="range" id="white-temp-slider" class="hm-white-temp-range" min="0" max="100" value="${whiteTemp}" style="flex:1;" />
            <span class="hm-temp-end-label">Cool</span>
          </div>
        </div>

        <div class="hm-divider"></div>

        <!-- Color tabs -->
        <div class="hm-tabs">
          <button class="hm-tab ${activeTab === 'recent' ? 'active' : ''}" data-tab="recent">Recent</button>
          <button class="hm-tab ${activeTab === 'whites' ? 'active' : ''}" data-tab="whites">Whites</button>
          <button class="hm-tab ${activeTab === 'preset' ? 'active' : ''}" data-tab="preset">Preset</button>
          <button class="hm-tab ${activeTab === 'rgb' ? 'active' : ''}" data-tab="rgb">Custom</button>
        </div>

        <!-- Tab content: 2-row color grid -->
        ${showColorGrid ? `
          <div class="hm-color-grid">
            ${tabColors.map(c => `<button class="hm-color-swatch" style="background:${c}" data-color="${c}"></button>`).join('')}
          </div>
        ` : ''}
        ${activeTab === 'rgb' ? `
          <div class="hm-rgb-section">
            <div class="ctrl-rgb-row">
              <label>H</label>
              <input type="range" class="ctrl-range-rgb" id="rgb-h" min="0" max="360" value="${Math.round(selectedHue)}" />
              <span>${Math.round(selectedHue)}</span>
            </div>
            <div class="ctrl-rgb-row">
              <label>S</label>
              <input type="range" class="ctrl-range-rgb" id="rgb-s" min="0" max="100" value="${Math.round(selectedSat)}" />
              <span>${Math.round(selectedSat)}%</span>
            </div>
            <div class="ctrl-rgb-hex">
              <span class="ctrl-rgb-hex-label">#</span>
              <input type="text" class="ctrl-rgb-hex-input" id="rgb-hex" value="${hslToHex(selectedHue, selectedSat, PATTERN_COLOR_LIGHTNESS)}" maxlength="6" />
            </div>
          </div>
        ` : ''}

        <div class="hm-divider"></div>

        <!-- Action buttons -->
        <div class="hm-action-row">
          <button class="hm-action-outline" data-action="patterns">PATTERNS</button>
          <button class="hm-action-outline" id="movement-toggle">
            <span>${selectedMovement.toUpperCase()}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="hm-action-row" style="margin-bottom: var(--space-md);">
          <button class="hm-action-fill" id="home-apply">SET PATTERN</button>
          <button class="hm-action-fill" id="home-save">SAVE AS PATTERN</button>
        </div>

      </div>
    `;

    drawWheel();
    attachEvents();
    requestAnimationFrame(() => {
      updateSelectorPos();
      initBrightSlider();
      refreshDotDisplays();
      const tempSlider = container.querySelector('#white-temp-slider');
      if (tempSlider) tempSlider.style.setProperty('--thumb-color', whiteTempToColor(whiteTemp));
    });
  }

  // ── Canvas drawing ──────────────────────────────────────────────────────────

  function drawWheel() {
    const canvas = container.querySelector('#home-wheel');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 4;

    for (let angle = 0; angle < 360; angle++) {
      const s = (angle - 0.9) * Math.PI / 180;
      const e = (angle + 0.9) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, s, e);
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    // Saturation gradient (white fade from center)
    const satGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    satGrad.addColorStop(0, 'rgba(255,255,255,1)');
    satGrad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    satGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = satGrad;
    ctx.fill();

    // Darkness vignette at edge
    const darkGrad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius);
    darkGrad.addColorStop(0, 'rgba(0,0,0,0)');
    darkGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = darkGrad;
    ctx.fill();
  }

  function updateSelectorPos() {
    const canvas = container.querySelector('#home-wheel');
    const selector = container.querySelector('#home-selector');
    if (!canvas || !selector) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 4;
    const maxDist = radius - 14;
    const dist = (selectedSat / 100) * maxDist;
    const angle = selectedHue * Math.PI / 180;
    const x = cx + dist * Math.cos(angle);
    const y = cy + dist * Math.sin(angle);
    const sx = rect.width / canvas.width;
    const sy = rect.height / canvas.height;
    selector.style.left = (x * sx) + 'px';
    selector.style.top = (y * sy) + 'px';
    selector.style.background = getColor();
  }

  function pickColorFromWheel(e) {
    const canvas = container.querySelector('#home-wheel');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 4;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;
    selectedHue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
    selectedSat = Math.min((dist / (radius - 14)) * 100, 100);
    updateSelectorPos();
    updateBrightTrackColor();
    updateActiveDotColor();
  }

  // ── Vertical brightness slider ──────────────────────────────────────────────

  function initBrightSlider() {
    const track = container.querySelector('#bright-track');
    const thumb = container.querySelector('#bright-thumb');
    if (!track || !thumb) return;
    updateBrightTrackColor();
    placeBrightThumb();

    // Debounced hardware send covers every input path: mouse drag, touch drag, track click
    let brightDebounce = null;
    function setFromY(clientY) {
      const rect = track.getBoundingClientRect();
      const thumbH = thumb.offsetHeight;
      let pct = (clientY - rect.top - thumbH / 2) / (rect.height - thumbH);
      pct = Math.max(0, Math.min(1, pct));
      brightness = Math.round((1 - pct) * 100);
      state.brightness = brightness;
      placeBrightThumb();
      refreshDotDisplays();
      clearTimeout(brightDebounce);
      brightDebounce = setTimeout(() => api.setBrightness(brightness), 200);
    }

    const onMove = e => setFromY(e.touches ? e.touches[0].clientY : e.clientY);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    thumb.addEventListener('mousedown', e => {
      e.preventDefault();
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    thumb.addEventListener('touchstart', e => { e.preventDefault(); onMove(e); }, { passive: false });
    thumb.addEventListener('touchmove', e => { e.preventDefault(); onMove(e); }, { passive: false });
    track.addEventListener('click', e => { if (e.target !== thumb) setFromY(e.clientY); });
  }

  function placeBrightThumb() {
    const track = container.querySelector('#bright-track');
    const thumb = container.querySelector('#bright-thumb');
    if (!track || !thumb) return;
    const trackH = track.offsetHeight;
    const thumbH = thumb.offsetHeight;
    const capR = 14; // matches border-radius of the track
    // Keep the thumb center between the two rounded caps so it's never clipped
    const minTop = capR - thumbH / 2;           // 14 - 11 = 3px
    const maxTop = trackH - capR - thumbH / 2;  // 220 - 14 - 11 = 195px
    const topPx = minTop + (1 - brightness / 100) * (maxTop - minTop);
    thumb.style.top = topPx + 'px';
  }

  function updateBrightTrackColor() {
    const track = container.querySelector('#bright-track');
    if (!track) return;
    track.style.background = `linear-gradient(to bottom, ${getColor()} 0%, #000000 100%)`;
  }

  // Surgically updates the pattern dot row without triggering a full re-render + screen-entry animation
  function updatePatternRow() {
    const countEl = container.querySelector('.hm-pattern-count');
    if (countEl) countEl.textContent = `Repeat every ${patternCount} LED${patternCount > 1 ? 's' : ''}`;

    const dotsEl = container.querySelector('.hm-pattern-dots');
    if (!dotsEl) return;
    dotsEl.innerHTML = patternColors.map((c, i) =>
      `<div class="hm-pattern-dot${i === activeDotIdx ? ' active' : ''}" data-dot-idx="${i}" style="background:${c};box-shadow:0 0 8px ${c}88;"></div>`
    ).join('');
    dotsEl.querySelectorAll('.hm-pattern-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => {
        activeDotIdx = i;
        const { h, s } = hexToHsl(patternColors[i]);
        selectedHue = h;
        selectedSat = s;
        container.querySelectorAll('.hm-pattern-dot').forEach((d, j) => d.classList.toggle('active', j === i));
        updateSelectorPos();
        updateBrightTrackColor();
      });
    });
    refreshDotDisplays();
  }

  // ── Movement bottom sheet ────────────────────────────────────────────────────

  function showMovementSheet() {
    const ICONS = {
      'Stationary': '■', 'Chase': '⚡', 'Twinkle': '✨', 'Wave': '🌊',
      'Fade': '🌫️', 'Meteor': '☄️', 'Pulse': '💓', 'Bounce': '↕',
    };
    const DESC = {
      'Stationary': 'All lights stay on',
      'Chase': 'Lights run in sequence',
      'Twinkle': 'Random sparkle effect',
      'Wave': 'Rolling wave motion',
      'Fade': 'Smooth fade in and out',
      'Meteor': 'Shooting star effect',
      'Pulse': 'Rhythmic breathing pulse',
      'Bounce': 'Back and forth bounce',
    };

    const overlay = document.createElement('div');
    overlay.className = 'save-pattern-overlay';
    overlay.innerHTML = `
      <div class="save-pattern-sheet">
        <div class="save-pattern-handle"></div>
        <div class="save-pattern-title">Movement</div>
        <div class="hm-movement-sheet-list">
          ${movements.map(m => `
            <button class="hm-movement-sheet-opt ${selectedMovement === m ? 'active' : ''}" data-movement="${m}">
              <span class="movement-opt-icon">${ICONS[m] ?? '●'}</span>
              <div class="movement-opt-text">
                <span class="movement-opt-name">${m}</span>
                <span class="movement-opt-desc">${DESC[m] ?? ''}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.getElementById('app-frame').appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelectorAll('.hm-movement-sheet-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedMovement = opt.dataset.movement;
        state.selectedMovement = selectedMovement;
        overlay.remove();
        render();
      });
    });
  }

  // ── Save pattern sheet ──────────────────────────────────────────────────────

  function showSavePatternSheet() {
    const overlay = document.createElement('div');
    overlay.className = 'save-pattern-overlay';
    overlay.innerHTML = `
      <div class="save-pattern-sheet">
        <div class="save-pattern-handle"></div>
        <div class="save-pattern-title">Save Pattern</div>
        <input class="pe-input" id="sps-name" type="text" value="My Pattern" placeholder="Pattern name" style="margin-bottom:16px;" />
        <button class="hm-action-fill" id="sps-save">SAVE TO MY PATTERNS</button>
      </div>
    `;
    document.getElementById('app-frame').appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const input = overlay.querySelector('#sps-name');
    input.select();
    overlay.querySelector('#sps-save')?.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) { showToast('Please enter a name'); return; }
      scenes.push({
        id: Date.now(),
        name,
        categoryId: 'your-patterns',
        colors: [...patternColors],
        animation: selectedMovement,
        direction: 'forward',
        speed: 3,
        favorite: false,
      });
      overlay.remove();
      showToast(`Saved: ${name}`);
      state.scenesTargetCategory = 'your-patterns';
      setTimeout(() => navigate('scenes'), 400);
    });
  }

  // ── Zone & Controller sheet ─────────────────────────────────────────────────

  function showZoneSheet() {
    let activeCtrlId = state.controllers[0]?.id ?? null;

    function buildZoneChips() {
      const ctrl = state.controllers.find(c => c.id === activeCtrlId);
      if (!ctrl) return '';
      return ctrl.zones.map(z =>
        `<button class="ctrl-zone-chip ${z.active ? 'active' : ''}" data-zone-id="${z.id}">${z.shortName ?? z.name}</button>`
      ).join('');
    }

    const overlay = document.createElement('div');
    overlay.className = 'save-pattern-overlay';
    overlay.innerHTML = `
      <div class="save-pattern-sheet">
        <div class="save-pattern-handle"></div>
        <div class="save-pattern-title">Select Zones</div>
        <div class="sched-field-label">Controller</div>
        <div class="sched-trigger-row" id="zs-ctrl-row">
          ${state.controllers.map(ctrl =>
            `<button class="sched-trigger-chip ${ctrl.id === activeCtrlId ? 'active' : ''}" data-ctrl-id="${ctrl.id}">${ctrl.name}</button>`
          ).join('')}
        </div>
        <div class="sched-field-label" style="margin-top:var(--space-sm);">Zones</div>
        <div class="sched-trigger-row" id="zs-zone-row" style="flex-wrap:wrap;">
          ${buildZoneChips()}
        </div>
        <button class="hm-action-fill" id="zs-done" style="margin-top:var(--space-md);">Done</button>
      </div>
    `;

    document.getElementById('app-frame').appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); render(); } });

    overlay.querySelectorAll('[data-ctrl-id]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeCtrlId = chip.dataset.ctrlId;
        overlay.querySelectorAll('[data-ctrl-id]').forEach(c =>
          c.classList.toggle('active', c.dataset.ctrlId === activeCtrlId)
        );
        const zoneRow = overlay.querySelector('#zs-zone-row');
        if (zoneRow) zoneRow.innerHTML = buildZoneChips();
        attachZoneEvents();
      });
    });

    function attachZoneEvents() {
      overlay.querySelectorAll('[data-zone-id]').forEach(chip => {
        chip.addEventListener('click', () => {
          const zone = state.allZones.find(z => z.id === chip.dataset.zoneId);
          if (!zone) return;
          zone.active = !zone.active;
          chip.classList.toggle('active', zone.active);
        });
      });
    }

    attachZoneEvents();

    overlay.querySelector('#zs-done')?.addEventListener('click', () => {
      overlay.remove();
      render();
    });
  }

  // ── Event wiring ────────────────────────────────────────────────────────────

  function attachEvents() {
    // Color wheel mouse/touch
    const canvas = container.querySelector('#home-wheel');
    if (canvas) {
      canvas.addEventListener('mousedown', e => {
        pickColorFromWheel(e);
        const onMove = e2 => pickColorFromWheel(e2);
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      canvas.addEventListener('touchstart', e => { e.preventDefault(); pickColorFromWheel(e); }, { passive: false });
      canvas.addEventListener('touchmove', e => { e.preventDefault(); pickColorFromWheel(e); }, { passive: false });
    }

    // White temp slider — independent from color wheel (Philips Hue approach)
    container.querySelector('#white-temp-slider')?.addEventListener('input', e => {
      whiteTemp = parseInt(e.target.value);
      const label = container.querySelector('#temp-label');
      if (label) label.textContent = getTempValue(whiteTemp);

      const tempHex = whiteTempToColor(whiteTemp);

      // Thumb color follows the temperature position (warm orange → white → cool blue)
      e.target.style.setProperty('--thumb-color', tempHex);

      // Update LED dot directly with the white temperature color (don't move the wheel)
      patternColors[activeDotIdx] = tempHex;
      refreshDotDisplays();

      // Update brightness track gradient to match the white tone
      const track = container.querySelector('#bright-track');
      if (track) track.style.background = `linear-gradient(to bottom, ${tempHex} 0%, #000000 100%)`;
    });

    // Color swatches
    container.querySelectorAll('.hm-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const { h, s } = hexToHsl(sw.dataset.color);
        selectedHue = h;
        selectedSat = s;
        updateSelectorPos();
        updateBrightTrackColor();
        updateActiveDotColor();
        container.querySelectorAll('.hm-color-swatch').forEach(s2 => s2.classList.remove('selected'));
        sw.classList.add('selected');
      });
    });

    // Tabs
    container.querySelectorAll('.hm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        render();
      });
    });

    // Pattern +/−
    container.querySelector('#pattern-plus')?.addEventListener('click', () => {
      if (patternCount < 8) {
        patternCount++;
        patternColors.push('#' + hslToHex(selectedHue, selectedSat, PATTERN_COLOR_LIGHTNESS));
        activeDotIdx = patternCount - 1;
        updatePatternRow();
      }
    });
    container.querySelector('#pattern-minus')?.addEventListener('click', () => {
      if (patternCount > 1) {
        patternCount--;
        patternColors.pop();
        activeDotIdx = Math.min(activeDotIdx, patternCount - 1);
        updatePatternRow();
      }
    });

    // Dot selection
    container.querySelectorAll('.hm-pattern-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => {
        activeDotIdx = i;
        const { h, s } = hexToHsl(patternColors[i]);
        selectedHue = h;
        selectedSat = s;
        updateSelectorPos();
        updateBrightTrackColor();
        container.querySelectorAll('.hm-pattern-dot').forEach((d, j) => d.classList.toggle('active', j === i));
      });
    });

    // RGB tab inputs
    container.querySelector('#rgb-h')?.addEventListener('input', e => {
      selectedHue = parseInt(e.target.value);
      e.target.nextElementSibling.textContent = Math.round(selectedHue);
      updateSelectorPos();
      updateBrightTrackColor();
      updateActiveDotColor();
    });
    container.querySelector('#rgb-s')?.addEventListener('input', e => {
      selectedSat = parseInt(e.target.value);
      e.target.nextElementSibling.textContent = Math.round(selectedSat) + '%';
      updateSelectorPos();
      updateBrightTrackColor();
      updateActiveDotColor();
    });

    // Zone & controller picker
    container.querySelector('#hm-zone-btn')?.addEventListener('click', () => showZoneSheet());

    // Settings
    container.querySelector('#hm-settings-btn')?.addEventListener('click', () => navigate('support'));

    // Set Pattern — saves color to recent list
    container.querySelector('#home-apply')?.addEventListener('click', () => {
      state.lightsOn = true;
      state.brightness = brightness;
      state.activeScene = 'Custom';
      state.selectedMovement = selectedMovement;
      const hex = '#' + hslToHex(selectedHue, selectedSat, PATTERN_COLOR_LIGHTNESS);
      state.activeColor = hex;
      if (!state.recentColors) state.recentColors = [...recentColors];
      state.recentColors = [hex, ...state.recentColors.filter(c => c !== hex)].slice(0, 16);
      document.getElementById('nav-control')?.classList.remove('lights-off');
      syncFabColor(hex);
      // Send pattern to WLED hardware
      api.applyToHardware(state, patternColors);
      showToast('Pattern applied');
    });

    // Save As Pattern
    container.querySelector('#home-save')?.addEventListener('click', () => showSavePatternSheet());

    // Patterns button — clear any saved category target so scenes always opens the category grid
    container.querySelector('[data-action="patterns"]')?.addEventListener('click', () => {
      state.scenesTargetCategory = null;
      navigate('scenes');
    });

    // Movement → opens bottom sheet
    container.querySelector('#movement-toggle')?.addEventListener('click', () => showMovementSheet());
  }

  render();
}

