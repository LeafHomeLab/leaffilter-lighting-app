import * as api from '../api.js';

export function renderZones(container, state, navigate) {
  function render() {
    const activeZones = state.allZones.filter(z => z.active);
    const activeLeds = activeZones.reduce((s, z) => s + z.leds, 0);
    const allActive = state.allZones.length > 0 && activeZones.length === state.allZones.length;

    const html = `
      <div class="screen" id="screen-zones">
        <div class="zones-header">
          <div class="zones-header-left">
            <h1 class="screen-title">Zones</h1>
            <p class="zones-summary">${activeZones.length} of ${state.allZones.length} active &middot; ${activeLeds} LEDs on</p>
          </div>
          <button class="btn btn-ghost btn-sm zones-bulk-btn" id="zones-bulk-toggle">
            ${allActive ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div class="zones-card-list stagger">
          ${state.allZones.length === 0 ? `
            <div class="zones-empty">
              <div class="zones-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <p class="zones-empty-text">No zones configured</p>
            </div>
          ` : state.allZones.map(z => `
            <label class="zones-card ${z.active ? 'zones-card--active' : ''}" data-zone-id="${z.id}">
              <div class="zones-card-body">
                <div class="zones-card-name">${z.name}</div>
                <div class="zones-card-leds">${z.leds} LEDs</div>
              </div>
              <div class="toggle">
                <input type="checkbox" class="zone-toggle-input" data-zone-id="${z.id}" ${z.active ? 'checked' : ''}>
                <span class="toggle-track"></span>
              </div>
            </label>
          `).join('')}
        </div>

        <div class="section-label" style="margin-top: var(--space-xl);">Controller</div>
        <div class="card" style="padding: var(--space-md); margin-bottom: var(--space-md);">
          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <div style="width:44px; height:44px; border-radius: var(--radius-md); background: var(--accent-subtle); display:flex; align-items:center; justify-content:center; font-size:22px;">&#128225;</div>
            <div style="flex:1;">
              <div style="font-weight: var(--fw-semibold);">Main Controller</div>
              <div style="font-size: var(--fs-small); color: var(--text-secondary);">Firmware v2.4.1 &middot; 478 LEDs</div>
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

    container.querySelectorAll('.zone-toggle-input').forEach(input => {
      input.addEventListener('change', () => {
        const zid = input.dataset.zoneId;
        const zone = state.allZones.find(z => z.id === zid);
        if (zone) {
          zone.active = input.checked;
          if (zone.active) {
            if (!state.activeZones.includes(zid)) state.activeZones.push(zid);
          } else {
            state.activeZones = state.activeZones.filter(id => id !== zid);
          }
          render();
          api.setZoneActive(zid, zone.active);
        }
      });
    });

    container.querySelector('#zones-bulk-toggle')?.addEventListener('click', () => {
      const shouldActivate = !state.allZones.every(z => z.active);
      state.allZones.forEach(z => z.active = shouldActivate);
      state.activeZones = shouldActivate ? state.allZones.map(z => z.id) : [];
      render();
      state.allZones.forEach(z => {
        api.setZoneActive(z.id, shouldActivate);
      });
    });
  }

  render();
}
