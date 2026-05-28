export function renderHome(container, state, navigate) {
  const recentColors = [
    '#FF1493','#FF69B4','#ADFF2F','#1E90FF','#DA70D6','#9B59B6','#FF4500','#2ECC71',
    '#00FF7F','#F0F0F0','#FF8C00','#FFD700','#E74C3C','#8B00FF','#FF6347','#00BCD4'
  ];
  const whiteColors = [
    '#FF9329','#FFB347','#FFD580','#FFF5E0','#FFFFF0','#F5F0FF',
    '#FFAD5C','#FFCC80','#FFF8DC','#FFFAFA','#E8F0FF','#90B8FF'
  ];

  const movements = ['Stationary', 'Chase', 'Twinkle', 'Wave', 'Fade', 'Meteor', 'Pulse', 'Bounce'];

  const colorPresets = [
    { name: 'Sunset',   colors: ['#FF4500', '#FF8C00', '#FFD700'] },
    { name: 'Ocean',    colors: ['#006994', '#00BFFF', '#40E0D0'] },
    { name: 'Forest',   colors: ['#228B22', '#32CD32', '#90EE90'] },
    { name: 'Candy',    colors: ['#FF1493', '#FF69B4', '#DA70D6'] },
    { name: 'Arctic',   colors: ['#87CEEB', '#B0E0E6', '#E0F0FF'] },
    { name: 'Fire',     colors: ['#CC0000', '#FF4500', '#FF8C00'] },
    { name: 'Lavender', colors: ['#6A0DAD', '#9370DB', '#DA70D6'] },
    { name: 'Mint',     colors: ['#00CED1', '#20B2AA', '#7FFFD4'] },
  ];

  let selectedHue = 0;
  let selectedSat = 90;
  let brightness = state.brightness ?? 75;
  let whiteTemp = 50;
  let activeTab = 'recent';
  let patternCount = 1;
  let patternColors = ['#' + hslToHex(selectedHue, selectedSat, 55)];
  let activeDotIdx = 0;
  let selectedMovement = state.selectedMovement ?? 'Stationary';

  function getTempValue(val) {
    const temp = Math.round((1800 + (val / 100) * (6500 - 1800)) / 100) * 100;
    return `${temp}K`;
  }

  function getColor() {
    return `hsl(${selectedHue}, ${selectedSat}%, 55%)`;
  }

  function updateActiveDotColor() {
    const hex = '#' + hslToHex(selectedHue, selectedSat, 55);
    patternColors[activeDotIdx] = hex;
    const dot = container.querySelectorAll('.hm-pattern-dot')[activeDotIdx];
    if (dot) {
      dot.style.background = hex;
      dot.style.boxShadow = `0 0 8px ${hex}88`;
    }
  }

  function render() {
    const activeZoneNames = state.allZones.filter(z => z.active).map(z => z.name);
    const zoneLabel = activeZoneNames.length === 0 ? 'NONE'
      : activeZoneNames.length === 1 ? activeZoneNames[0].toUpperCase()
      : `${activeZoneNames[0].toUpperCase()} +${activeZoneNames.length - 1}`;
    const currentColor = getColor();

    const showColorGrid = activeTab === 'recent' || activeTab === 'whites';
    const tabColors = activeTab === 'whites' ? whiteColors : (state.recentColors ?? recentColors);

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
            <button class="hm-zone-btn" id="hm-zone-btn">SELECT ZONE(S)</button>
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
          <div class="hm-temp-row">
            <!-- Warm end icon -->
            <div class="hm-temp-cap hm-temp-cap--warm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                <circle cx="12" cy="12" r="4" fill="currentColor"/>
              </svg>
            </div>
            <!-- Slider + label -->
            <div class="hm-temp-slider-wrap">
              <input type="range" id="white-temp-slider" class="hm-white-temp-range" min="0" max="100" value="${whiteTemp}" />
              <div class="hm-temp-badge" id="temp-label">${getTempValue(whiteTemp)}</div>
            </div>
            <!-- Cool end icon -->
            <div class="hm-temp-cap hm-temp-cap--cool">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
                <line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>
              </svg>
            </div>
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
        ${activeTab === 'preset' ? `
          <div class="hm-palette-grid">
            ${colorPresets.map((p, i) => `
              <button class="hm-palette-card" data-palette-idx="${i}">
                <div class="hm-palette-swatches">
                  ${p.colors.map(c => `<div style="background:${c};"></div>`).join('')}
                </div>
                <div class="hm-palette-name">${p.name}</div>
              </button>
            `).join('')}
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
              <input type="text" class="ctrl-rgb-hex-input" id="rgb-hex" value="${hslToHex(selectedHue, selectedSat, 55)}" maxlength="6" />
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
          <button class="hm-action-fill hm-action-secondary" id="home-save">SAVE AS PATTERN</button>
        </div>

      </div>
    `;

    drawWheel();
    attachEvents();
    requestAnimationFrame(() => {
      updateSelectorPos();
      initBrightSlider();
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

    function setFromY(clientY) {
      const rect = track.getBoundingClientRect();
      const thumbH = thumb.offsetHeight;
      let pct = (clientY - rect.top - thumbH / 2) / (rect.height - thumbH);
      pct = Math.max(0, Math.min(1, pct));
      brightness = Math.round((1 - pct) * 100);
      state.brightness = brightness;
      placeBrightThumb();
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
    const topPx = (1 - brightness / 100) * (trackH - thumbH);
    thumb.style.top = topPx + 'px';
  }

  function updateBrightTrackColor() {
    const track = container.querySelector('#bright-track');
    if (!track) return;
    track.style.background = `linear-gradient(to top, #000000, ${getColor()})`;
  }

  // ── Movement bottom sheet ────────────────────────────────────────────────────

  function showMovementSheet() {
    const overlay = document.createElement('div');
    overlay.className = 'save-pattern-overlay';
    overlay.innerHTML = `
      <div class="save-pattern-sheet">
        <div class="save-pattern-handle"></div>
        <div class="save-pattern-title">Movement</div>
        <div class="hm-movement-sheet-list">
          ${movements.map(m => `
            <button class="hm-movement-sheet-opt ${selectedMovement === m ? 'active' : ''}" data-movement="${m}">${m}</button>
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

    // White temp slider
    container.querySelector('#white-temp-slider')?.addEventListener('input', e => {
      whiteTemp = parseInt(e.target.value);
      const label = container.querySelector('#temp-label');
      if (label) label.textContent = getTempValue(whiteTemp);
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
        patternColors.push('#' + hslToHex(selectedHue, selectedSat, 55));
        activeDotIdx = patternCount - 1;
        render();
      }
    });
    container.querySelector('#pattern-minus')?.addEventListener('click', () => {
      if (patternCount > 1) {
        patternCount--;
        patternColors.pop();
        activeDotIdx = Math.min(activeDotIdx, patternCount - 1);
        render();
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

    // Palette cards
    container.querySelectorAll('.hm-palette-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.paletteIdx);
        const { h, s } = hexToHsl(colorPresets[idx].colors[0]);
        selectedHue = h;
        selectedSat = s;
        updateSelectorPos();
        updateBrightTrackColor();
        updateActiveDotColor();
        container.querySelectorAll('.hm-palette-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Zone select → zones screen
    container.querySelector('#hm-zone-btn')?.addEventListener('click', () => navigate('zones'));

    // Settings
    container.querySelector('#hm-settings-btn')?.addEventListener('click', () => navigate('support'));

    // Set Pattern — saves color to recent list
    container.querySelector('#home-apply')?.addEventListener('click', () => {
      state.lightsOn = true;
      state.brightness = brightness;
      state.activeScene = 'Custom';
      state.selectedMovement = selectedMovement;
      const hex = '#' + hslToHex(selectedHue, selectedSat, 55);
      if (!state.recentColors) state.recentColors = [...recentColors];
      state.recentColors = [hex, ...state.recentColors.filter(c => c !== hex)].slice(0, 16);
      showToast('Pattern applied');
    });

    // Save As Pattern
    container.querySelector('#home-save')?.addEventListener('click', () => navigate('control'));

    // Patterns button
    container.querySelector('[data-action="patterns"]')?.addEventListener('click', () => navigate('scenes'));

    // Movement → opens bottom sheet
    container.querySelector('#movement-toggle')?.addEventListener('click', () => showMovementSheet());
  }

  render();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
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
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.getElementById('app-frame').appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
