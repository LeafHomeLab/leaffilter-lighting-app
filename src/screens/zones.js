export function renderZones(container, state) {
  function render() {
    const html = `
      <div class="screen" id="screen-zones">
        <div class="screen-header">
          <h1 class="screen-title">Zones</h1>
          <button class="btn-icon" id="add-zone-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <!-- House Map (larger) -->
        <div class="zones-map">
          <svg viewBox="0 0 320 200" width="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="90" width="240" height="100" rx="4" fill="var(--bg-tertiary)" stroke="var(--border)" stroke-width="1"/>
            <polygon points="160,18 25,90 295,90" fill="var(--bg-tertiary)" stroke="var(--border)" stroke-width="1"/>
            <rect x="200" y="125" width="55" height="60" rx="3" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            <rect x="65" y="110" width="40" height="32" rx="2" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            <rect x="125" y="110" width="40" height="32" rx="2" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            <rect x="135" y="150" width="24" height="40" rx="2" fill="var(--bg-quaternary)" stroke="var(--border)" stroke-width="1"/>
            ${state.allZones.filter(z => ['left','peaks','right','front','garage'].includes(z.id)).map(z => {
              const paths = {
                left: 'M25,90 L92,54',
                peaks: 'M92,54 L160,18 L228,54',
                right: 'M228,54 L295,90',
                front: 'M25,90 L295,90',
                garage: 'M195,90 L195,190 L260,190 L260,90'
              };
              return `<polyline class="zone-segment ${z.active ? 'active' : ''}" data-zone="${z.id}" points="${paths[z.id]?.split(' ').map(p => p.replace('M','').replace('L','')).join(' ')}" stroke-width="${z.id === 'front' ? 4 : 3}"/>`;
            }).join('')}
          </svg>
        </div>

        <!-- All/None toggle -->
        <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-md);">
          <button class="btn btn-secondary btn-sm" id="select-all-zones" style="flex:1;">Select All</button>
          <button class="btn btn-secondary btn-sm" id="deselect-all-zones" style="flex:1;">Deselect All</button>
        </div>

        <!-- Zone List -->
        <div class="section-label">All Zones</div>
        <div class="zones-list stagger">
          ${state.allZones.map(z => `
            <button class="zone-btn ${z.active ? 'active' : ''}" data-zone-id="${z.id}">
              <div class="zone-btn-indicator"></div>
              <div class="zone-btn-info">
                <div class="zone-btn-name">${z.name}</div>
                <div class="zone-btn-detail">${z.leds} LEDs · ${z.active ? 'Active' : 'Off'}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          `).join('')}
        </div>

        <!-- Controller Info -->
        <div class="section-label" style="margin-top: var(--space-lg);">Controller</div>
        <div class="card" style="margin-bottom: var(--space-md);">
          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <div style="width:44px; height:44px; border-radius: var(--radius-md); background: var(--accent-subtle); display:flex; align-items:center; justify-content:center; font-size:22px;">📡</div>
            <div style="flex:1;">
              <div style="font-weight: var(--fw-semibold);">Main Controller</div>
              <div style="font-size: var(--fs-small); color: var(--text-secondary);">Firmware v2.4.1 · 478 LEDs</div>
            </div>
            <div class="chip chip-active">
              <span class="chip-dot online"></span>
              Online
            </div>
          </div>
        </div>

        <div style="height: 24px;"></div>
      </div>
    `;
    container.innerHTML = html;

    // Zone toggle
    container.querySelectorAll('.zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const zid = btn.dataset.zoneId;
        const zone = state.allZones.find(z => z.id === zid);
        if (zone) {
          zone.active = !zone.active;
          if (zone.active) { state.activeZones.push(zid); } else { state.activeZones = state.activeZones.filter(z => z !== zid); }
          render();
        }
      });
    });

    // Select all / none
    container.querySelector('#select-all-zones')?.addEventListener('click', () => {
      state.allZones.forEach(z => z.active = true);
      state.activeZones = state.allZones.map(z => z.id);
      render();
    });
    container.querySelector('#deselect-all-zones')?.addEventListener('click', () => {
      state.allZones.forEach(z => z.active = false);
      state.activeZones = [];
      render();
    });
  }

  render();
}
