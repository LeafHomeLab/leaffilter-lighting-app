import { scenes } from '../data/scenes.js';

export function renderSchedule(container, state) {
  let viewMode = 'calendar';

  let schedules = state.schedules ?? [
    { id: 1, trigger: 'Sunset', time: 'Sunset',  ampm: '',   timeVal: '',      label: 'Every Day',      scene: 'Warm Architectural', zones: 'All Zones',           repeat: 'daily',    customDays: [], active: true  },
    { id: 2, trigger: 'Time',   time: '11:30',    ampm: 'PM', timeVal: '23:30', label: 'Every Day',      scene: 'All Off',            zones: 'All Zones',           repeat: 'daily',    customDays: [], active: true  },
    { id: 3, trigger: 'Time',   time: '5:00',     ampm: 'PM', timeVal: '17:00', label: 'Nov 25 – Jan 2', scene: 'Christmas Classic',  zones: 'All Zones',           repeat: 'seasonal', customDays: [], active: true  },
    { id: 4, trigger: 'Time',   time: '6:00',     ampm: 'PM', timeVal: '18:00', label: 'Every Sunday',   scene: 'Game Day',           zones: 'Front, Peaks',        repeat: 'weekly-0', customDays: [], active: false },
    { id: 5, trigger: 'Away',   time: 'Away',     ampm: '',   timeVal: '',      label: 'When Away',      scene: 'Security Sweep',     zones: 'All Zones',           repeat: 'away',     customDays: [], active: false },
  ];
  state.schedules = schedules;

  let vacationActive   = state.vacationActive   ?? false;
  let vacationExpanded = false;
  let vacationScene    = state.vacationScene    ?? 'Security Sweep';
  let vacationBehavior = state.vacationBehavior ?? 'fixed';
  let vacationOnTime   = state.vacationOnTime   ?? '18:00';
  let vacationOffTime  = state.vacationOffTime  ?? '23:00';

  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const monthName   = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute which days in this month have active schedule events
  function getScheduledDays() {
    const days = new Set();
    schedules.filter(s => s.active).forEach(s => {
      if (s.repeat === 'daily') {
        for (let d = 1; d <= daysInMonth; d++) days.add(d);
      } else if (s.repeat === 'weekdays') {
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(year, month, d).getDay();
          if (dow >= 1 && dow <= 5) days.add(d);
        }
      } else if (s.repeat === 'weekends') {
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(year, month, d).getDay();
          if (dow === 0 || dow === 6) days.add(d);
        }
      } else if (s.repeat && s.repeat.startsWith('weekly-')) {
        const target = parseInt(s.repeat.split('-')[1]);
        for (let d = 1; d <= daysInMonth; d++) {
          if (new Date(year, month, d).getDay() === target) days.add(d);
        }
      } else if (s.repeat === 'custom' && s.customDays?.length) {
        for (let d = 1; d <= daysInMonth; d++) {
          if (s.customDays.includes(new Date(year, month, d).getDay())) days.add(d);
        }
      }
    });
    return days;
  }

  function deleteSchedule(id) {
    schedules = schedules.filter(s => s.id !== id);
    state.schedules = schedules;
    render();
    showToast('Schedule deleted');
  }

  function toggleSchedule(id, active) {
    const s = schedules.find(s => s.id === id);
    if (s) { s.active = active; state.schedules = schedules; }
    // Update calendar dots without full re-render
    const days = getScheduledDays();
    container.querySelectorAll('.cal-day:not(.empty)').forEach(cell => {
      cell.classList.toggle('has-event', days.has(parseInt(cell.textContent)));
    });
  }

  function render() {
    const scheduledDays = getScheduledDays();

    container.innerHTML = `
      <div class="screen" id="screen-schedule">
        <div class="screen-header">
          <h1 class="screen-title">Schedule</h1>
          <button class="btn-icon" id="add-schedule-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <!-- View Toggle -->
        <div class="schedule-view-toggle">
          <button class="schedule-view-btn ${viewMode === 'calendar' ? 'active' : ''}" data-view="calendar">Calendar</button>
          <button class="schedule-view-btn ${viewMode === 'list' ? 'active' : ''}" data-view="list">List</button>
        </div>

        ${viewMode === 'calendar' ? `
          <div style="text-align:center; margin-bottom: var(--space-md);">
            <span style="font-weight: var(--fw-semibold); font-size: var(--fs-heading);">${monthName}</span>
          </div>
          <div class="calendar-grid">
            ${['S','M','T','W','T','F','S'].map(d => `<div class="cal-header">${d}</div>`).join('')}
            ${Array(firstDay).fill('<div class="cal-day empty"></div>').join('')}
            ${Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = day === now.getDate();
              const hasEvent = scheduledDays.has(day);
              return `<div class="cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">${day}</div>`;
            }).join('')}
          </div>
        ` : ''}

        <!-- Schedule List -->
        <div class="section-label" style="margin-top: var(--space-md);">
          ${viewMode === 'calendar' ? 'Upcoming' : 'All Schedules'}
        </div>
        <div class="schedule-list stagger">
          ${schedules.map(s => `
            <div class="schedule-card" data-schedule-id="${s.id}">
              <div class="schedule-time">
                <div class="schedule-time-value">${s.time}</div>
                <div class="schedule-time-label">${s.timeOff ? `→ ${s.timeOff}` : s.ampm}</div>
              </div>
              <div class="schedule-info">
                <div class="schedule-scene-name">${s.scene}</div>
                <div class="schedule-meta">${s.label} · ${s.zones}</div>
              </div>
              <label class="toggle">
                <input type="checkbox" class="schedule-toggle" data-id="${s.id}" ${s.active ? 'checked' : ''} />
                <div class="toggle-track"></div>
              </label>
              <button class="schedule-edit-btn" data-id="${s.id}" aria-label="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="schedule-delete-btn" data-id="${s.id}" aria-label="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Vacation Mode (bottom of screen) -->
        <div class="vacation-card ${vacationExpanded ? 'vacation-expanded' : ''}" style="margin-top: var(--space-md);">
          <div class="vacation-card-top">
            <div>
              <div style="font-weight: var(--fw-semibold);">🏖️ Vacation Mode</div>
              <div style="font-size: var(--fs-caption); color: var(--text-secondary);">
                ${vacationActive ? `Running: ${vacationScene}` : 'Simulate presence while away'}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <label class="toggle" onclick="event.stopPropagation()">
                <input type="checkbox" id="vacation-toggle" ${vacationActive ? 'checked' : ''} />
                <div class="toggle-track"></div>
              </label>
              <button class="vacation-expand-btn ${vacationExpanded ? 'open' : ''}" id="vacation-expand">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
          </div>
          ${vacationExpanded ? `
            <div class="vacation-settings">
              <div class="sched-field-label" style="margin-top:12px;">Pattern while away</div>
              <div class="vacation-scene-row">
                ${['Security Sweep','Warm Architectural','Cool White'].map(s => `
                  <button class="sched-trigger-chip ${vacationScene === s ? 'active' : ''}" data-vscene="${s}">${s}</button>
                `).join('')}
              </div>
              <div class="sched-field-label" style="margin-top:12px;">Simulate activity</div>
              <div class="vacation-scene-row">
                <button class="sched-trigger-chip ${vacationBehavior === 'fixed' ? 'active' : ''}" data-vbehavior="fixed">Fixed times</button>
                <button class="sched-trigger-chip ${vacationBehavior === 'random' ? 'active' : ''}" data-vbehavior="random">Random intervals</button>
              </div>
              ${vacationBehavior === 'fixed' ? `
                <div class="vacation-time-row">
                  <div class="vacation-time-field">
                    <div class="vacation-time-label">Lights on at</div>
                    <input type="time" class="sched-input" id="vacation-on-time" value="${vacationOnTime}" />
                  </div>
                  <div class="vacation-time-field">
                    <div class="vacation-time-label">Lights off at</div>
                    <input type="time" class="sched-input" id="vacation-off-time" value="${vacationOffTime}" />
                  </div>
                </div>
              ` : `
                <div class="vacation-random-note">Lights turn on and off at random times each night to simulate someone being home.</div>
              `}
            </div>
          ` : ''}
        </div>

        <div style="height: 24px;"></div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    container.querySelectorAll('.schedule-view-btn').forEach(btn => {
      btn.addEventListener('click', () => { viewMode = btn.dataset.view; render(); });
    });

    container.querySelectorAll('.schedule-toggle').forEach(cb => {
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => toggleSchedule(parseInt(cb.dataset.id), cb.checked));
    });

    container.querySelectorAll('.schedule-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteSchedule(parseInt(btn.dataset.id)));
    });

    container.querySelectorAll('.schedule-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = schedules.find(s => s.id === parseInt(btn.dataset.id));
        if (s) showCreateSheet(s);
      });
    });

    container.querySelector('#add-schedule-btn')?.addEventListener('click', () => showCreateSheet());

    // Vacation mode toggle
    container.querySelector('#vacation-toggle')?.addEventListener('change', e => {
      vacationActive = e.target.checked;
      state.vacationActive = vacationActive;
      // Update subtitle text without full render
      const sub = container.querySelector('.vacation-card .vacation-card-top div div:last-child');
      if (sub) sub.textContent = vacationActive ? `Running: ${vacationScene}` : 'Simulate presence while away';
    });

    // Vacation expand/collapse
    container.querySelector('#vacation-expand')?.addEventListener('click', () => {
      vacationExpanded = !vacationExpanded;
      render();
    });

    // Vacation settings chips
    container.querySelectorAll('[data-vscene]').forEach(chip => {
      chip.addEventListener('click', () => {
        vacationScene = chip.dataset.vscene;
        state.vacationScene = vacationScene;
        container.querySelectorAll('[data-vscene]').forEach(c => c.classList.toggle('active', c.dataset.vscene === vacationScene));
      });
    });
    container.querySelectorAll('[data-vbehavior]').forEach(chip => {
      chip.addEventListener('click', () => {
        vacationBehavior = chip.dataset.vbehavior;
        state.vacationBehavior = vacationBehavior;
        render();
      });
    });

    container.querySelector('#vacation-on-time')?.addEventListener('change', e => {
      vacationOnTime = e.target.value;
      state.vacationOnTime = vacationOnTime;
    });
    container.querySelector('#vacation-off-time')?.addEventListener('change', e => {
      vacationOffTime = e.target.value;
      state.vacationOffTime = vacationOffTime;
    });
  }

  // ── Create / Edit Sheet ──────────────────────────────────────────────────────

  function showCreateSheet(existingSchedule = null) {
    document.querySelector('.sched-create-overlay')?.remove();

    const isEditing = !!existingSchedule;

    let trigger    = existingSchedule?.trigger ?? 'Sunset';
    if (trigger === 'Away') trigger = 'Sunset'; // Away is now handled by Vacation Mode
    let timeVal    = existingSchedule?.timeVal    ?? '18:00';
    let timeOffVal = existingSchedule?.timeOffVal ?? '23:00';
    let selectedId = existingSchedule?.sceneId ?? null;
    let sceneName  = existingSchedule?.scene ?? '';
    let zonesVal   = existingSchedule?.zones ?? 'All Zones';
    let customDays = [...(existingSchedule?.customDays ?? [])];

    let repeatVal = 'Every Day';
    if (existingSchedule) {
      const r = existingSchedule.repeat;
      if (r === 'weekdays') repeatVal = 'Weekdays';
      else if (r === 'weekends') repeatVal = 'Weekends';
      else if (r === 'once') repeatVal = 'Once';
      else if (r === 'custom' || r === 'weekly-0') repeatVal = 'Custom';
    }

    const dayAbbr  = ['S','M','T','W','T','F','S'];
    const DOW_FULL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function fmtTime(val) {
      if (!val) return '';
      const [h, m] = val.split(':').map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'sched-create-overlay';

    overlay.innerHTML = `
      <div class="sched-create-sheet">
        <div class="bottom-sheet-handle"></div>
        <div class="sched-create-title">${isEditing ? 'Edit Schedule' : 'New Schedule'}</div>

        <!-- Trigger -->
        <div class="sched-field-label">Trigger</div>
        <div class="sched-trigger-row">
          ${['Time','Sunset','Sunrise'].map(t =>
            `<button class="sched-trigger-chip ${trigger === t ? 'active' : ''}" data-trigger="${t}">${t}</button>`
          ).join('')}
        </div>

        <!-- On / Off time (only for Time trigger) -->
        <div id="sched-time-section" class="${trigger === 'Time' ? '' : 'sched-hidden'}" style="margin-top:var(--space-sm);">
          <div class="sched-time-row">
            <div class="sched-time-field">
              <div class="sched-field-label">Turn on at</div>
              <input type="time" class="sched-input" id="sched-time-on" value="${timeVal}" />
            </div>
            <div class="sched-time-field">
              <div class="sched-field-label">Turn off at</div>
              <input type="time" class="sched-input" id="sched-time-off" value="${timeOffVal}" />
            </div>
          </div>
        </div>

        <!-- Scene / Pattern (always visible) -->
        <div class="sched-field-label" style="margin-top:var(--space-sm);">Scene / Pattern</div>
        <input type="text" class="sched-input" id="sched-scene-search" placeholder="Search patterns…" autocomplete="off" style="margin-bottom:6px;" />
        <div class="sched-scene-list" id="sched-scene-list">
          ${scenes.map(s => `
            <button class="sched-scene-opt ${selectedId === s.id ? 'active' : ''}" data-id="${s.id}" data-name="${s.name}">
              <div class="sched-scene-colors-mini">
                ${s.colors.slice(0,4).map(c => `<div style="background:${c}"></div>`).join('')}
              </div>
              <span class="sched-scene-opt-name">${s.name}</span>
              ${selectedId === s.id ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </button>
          `).join('')}
        </div>

        <!-- Zones -->
        <div class="sched-field-label" style="margin-top:var(--space-sm);">Zones</div>
        <div class="sched-trigger-row">
          ${['All Zones','Active Zones'].map(z =>
            `<button class="sched-trigger-chip ${zonesVal === z ? 'active' : ''}" data-zones="${z}">${z}</button>`
          ).join('')}
        </div>

        <!-- Repeat -->
        <div class="sched-field-label" style="margin-top:var(--space-sm);">Repeat</div>
        <div class="sched-trigger-row" style="flex-wrap:wrap;">
          ${['Every Day','Weekdays','Weekends','Once','Custom'].map(r =>
            `<button class="sched-trigger-chip ${repeatVal === r ? 'active' : ''}" data-repeat="${r}">${r}</button>`
          ).join('')}
        </div>

        <!-- Custom day picker -->
        <div id="sched-custom-days" class="${repeatVal === 'Custom' ? '' : 'sched-hidden'}" style="margin-top:10px;">
          <div class="sched-days-row">
            ${dayAbbr.map((d, i) =>
              `<button class="sched-day-chip ${customDays.includes(i) ? 'active' : ''}" data-dow="${i}">${d}</button>`
            ).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div class="sched-create-actions">
          <button class="btn btn-secondary" id="sched-cancel" style="flex:1;">Cancel</button>
          <button class="btn btn-primary" id="sched-save" style="flex:1;">${isEditing ? 'Save Changes' : 'Save Schedule'}</button>
        </div>
      </div>
    `;

    document.getElementById('app-frame').appendChild(overlay);
    requestAnimationFrame(() => overlay.querySelector('.sched-create-sheet')?.classList.add('open'));

    // Trigger chips
    overlay.querySelectorAll('[data-trigger]').forEach(chip => {
      chip.addEventListener('click', () => {
        trigger = chip.dataset.trigger;
        overlay.querySelectorAll('[data-trigger]').forEach(c => c.classList.toggle('active', c.dataset.trigger === trigger));
        overlay.querySelector('#sched-time-section')?.classList.toggle('sched-hidden', trigger !== 'Time');
      });
    });

    overlay.querySelector('#sched-time-on')?.addEventListener('change', e => { timeVal = e.target.value; });
    overlay.querySelector('#sched-time-off')?.addEventListener('change', e => { timeOffVal = e.target.value; });

    // Scene search filter
    overlay.querySelector('#sched-scene-search')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      overlay.querySelectorAll('.sched-scene-opt').forEach(opt => {
        opt.style.display = opt.dataset.name.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    // Scene option select
    overlay.querySelectorAll('.sched-scene-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedId = parseInt(opt.dataset.id);
        sceneName  = opt.dataset.name;
        overlay.querySelectorAll('.sched-scene-opt').forEach(o => {
          o.classList.toggle('active', parseInt(o.dataset.id) === selectedId);
          const check = o.querySelector('svg');
          if (parseInt(o.dataset.id) === selectedId) {
            if (!check) o.insertAdjacentHTML('beforeend', '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>');
          } else { check?.remove(); }
        });
      });
    });

    // Zone chips
    overlay.querySelectorAll('[data-zones]').forEach(chip => {
      chip.addEventListener('click', () => {
        zonesVal = chip.dataset.zones;
        overlay.querySelectorAll('[data-zones]').forEach(c => c.classList.toggle('active', c.dataset.zones === zonesVal));
      });
    });

    // Repeat chips
    overlay.querySelectorAll('[data-repeat]').forEach(chip => {
      chip.addEventListener('click', () => {
        repeatVal = chip.dataset.repeat;
        overlay.querySelectorAll('[data-repeat]').forEach(c => c.classList.toggle('active', c.dataset.repeat === repeatVal));
        overlay.querySelector('#sched-custom-days')?.classList.toggle('sched-hidden', repeatVal !== 'Custom');
      });
    });

    // Custom day chips
    overlay.querySelectorAll('[data-dow]').forEach(chip => {
      chip.addEventListener('click', () => {
        const dow = parseInt(chip.dataset.dow);
        const idx = customDays.indexOf(dow);
        if (idx === -1) customDays.push(dow); else customDays.splice(idx, 1);
        chip.classList.toggle('active', customDays.includes(dow));
      });
    });

    overlay.querySelector('#sched-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#sched-save')?.addEventListener('click', () => {
      const scene = sceneName || 'Custom Pattern';

      let displayTime = trigger, ampm = '', displayTimeOff = '', ampmOff = '';
      if (trigger === 'Time' && timeVal) {
        const [h, m] = timeVal.split(':').map(Number);
        ampm = h >= 12 ? 'PM' : 'AM';
        displayTime = `${h % 12 || 12}:${String(m).padStart(2,'0')}`;
        if (timeOffVal) {
          const [hO, mO] = timeOffVal.split(':').map(Number);
          ampmOff = hO >= 12 ? 'PM' : 'AM';
          displayTimeOff = `${hO % 12 || 12}:${String(mO).padStart(2,'0')}`;
        }
      }

      const repeatMap  = { 'Every Day':'daily','Weekdays':'weekdays','Weekends':'weekends','Once':'once','Custom':'custom' };
      const customLabel = customDays.length ? customDays.sort((a,b)=>a-b).map(d => DOW_FULL[d]).join(', ') : 'Custom';
      const labelMap   = { 'Every Day':'Every Day','Weekdays':'Weekdays','Weekends':'Weekends','Once':'One Time','Custom':customLabel };

      const entry = {
        trigger,
        time: displayTime,
        ampm,
        timeVal:    trigger === 'Time' ? timeVal    : '',
        timeOffVal: trigger === 'Time' ? timeOffVal : '',
        timeOff:    displayTimeOff,
        ampmOff,
        label:      labelMap[repeatVal] ?? repeatVal,
        scene,
        sceneId:    selectedId,
        zones:      zonesVal,
        repeat:     repeatMap[repeatVal] ?? 'daily',
        customDays: repeatVal === 'Custom' ? [...customDays] : [],
        active:     true,
      };

      if (isEditing) {
        const idx = schedules.findIndex(s => s.id === existingSchedule.id);
        if (idx !== -1) schedules[idx] = { id: existingSchedule.id, ...entry };
      } else {
        schedules.push({ id: Date.now(), ...entry });
      }

      state.schedules = schedules;
      overlay.remove();
      render();
      showToast(isEditing ? 'Schedule updated' : `"${scene}" scheduled`);
    });
  }

  render();
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.getElementById('app-frame').appendChild(toast); }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}
