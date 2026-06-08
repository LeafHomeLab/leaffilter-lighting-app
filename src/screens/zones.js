import * as api from '../api.js';
import { showToast } from '../utils.js';

export function renderZones(container, state, _navigate) {
  function render() {
    const activeZones = state.allZones.filter(z => z.active);
    const activeLeds  = activeZones.reduce((s, z) => s + z.leds, 0);
    const allActive   = state.allZones.length > 0 && activeZones.length === state.allZones.length;

    container.innerHTML = `
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
        ` : state.controllers.map(ctrl => {
          const ctrlLeds = ctrl.zones.reduce((s, z) => s + z.leds, 0);
          return `
            <div class="section-label" style="margin-top:var(--space-md);">${ctrl.name}</div>
            <div class="zones-card-list">
              ${ctrl.zones.map(z => `
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
            <div class="card" style="padding:var(--space-md); margin-top:var(--space-sm);">
              <div style="display:flex; align-items:center; gap:var(--space-md);">
                <div style="width:44px; height:44px; border-radius:var(--radius-md); background:var(--accent-subtle); display:flex; align-items:center; justify-content:center; font-size:22px;">&#128225;</div>
                <div style="flex:1;">
                  <div style="font-weight:var(--fw-semibold);">${ctrl.name}</div>
                  <div style="font-size:var(--fs-small); color:var(--text-secondary);">${ctrl.zones.length} zones &middot; ${ctrlLeds} LEDs</div>
                </div>
                <div class="chip chip-active">
                  <span class="chip-dot online"></span>
                  Online
                </div>
              </div>
            </div>
          `;
        }).join('')}

        ${state.controllers.length < 2 ? `
          <button class="btn btn-secondary btn-block" id="add-controller-btn" style="margin-top:var(--space-md);">
            + Add Controller
          </button>
        ` : ''}

        <div style="height:24px;"></div>
      </div>
    `;

    container.querySelectorAll('.zone-toggle-input').forEach(input => {
      input.addEventListener('change', () => {
        const zone = state.allZones.find(z => z.id === input.dataset.zoneId);
        if (zone) {
          zone.active = input.checked;
          render();
          api.setZoneActive(zone, zone.active);
        }
      });
    });

    container.querySelector('#zones-bulk-toggle')?.addEventListener('click', () => {
      const shouldActivate = !state.allZones.every(z => z.active);
      state.allZones.forEach(z => { z.active = shouldActivate; });
      render();
      state.allZones.forEach(z => api.setZoneActive(z, shouldActivate));
    });

    container.querySelector('#add-controller-btn')?.addEventListener('click', showAddControllerSheet);
  }

  function showAddControllerSheet() {
    const overlay = document.createElement('div');
    overlay.className = 'sched-create-overlay';
    overlay.innerHTML = `
      <div class="sched-create-sheet">
        <div class="bottom-sheet-handle"></div>
        <div class="sched-create-title">Add Controller</div>
        <p style="font-size:var(--fs-small); color:var(--text-secondary); margin-bottom:var(--space-md);">
          Adds a simulated "Back Patio" controller for prototyping. In the production app this will launch Bluetooth pairing.
        </p>
        <div class="sched-create-actions">
          <button class="btn btn-secondary" id="addctrl-cancel" style="flex:1;">Cancel</button>
          <button class="btn btn-primary" id="addctrl-confirm" style="flex:1;">Add Controller</button>
        </div>
      </div>
    `;
    document.getElementById('app-frame').appendChild(overlay);
    requestAnimationFrame(() => overlay.querySelector('.sched-create-sheet')?.classList.add('open'));
    overlay.querySelector('#addctrl-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#addctrl-confirm')?.addEventListener('click', () => {
      overlay.remove();
      state.controllers.push({
        id: 'ctrl-back-patio',
        name: 'Back Patio',
        ip: '',
        zones: [
          { id: 'bp-roofline', name: 'Patio Roofline', shortName: 'Roofline', leds: 96, segId: 0, active: true,  color: null, brightness: null, scene: null },
          { id: 'bp-posts',    name: 'Post Lights',    shortName: 'Posts',    leds: 24, segId: 1, active: false, color: null, brightness: null, scene: null },
        ],
      });
      render();
      showToast('Back Patio controller added');
    });
  }

  render();
}
