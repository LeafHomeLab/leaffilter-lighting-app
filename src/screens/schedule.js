export function renderSchedule(container, state) {
  let viewMode = 'calendar';
  const schedules = [
    { id: 1, time: 'Sunset', label: 'Every Day', scene: 'Warm Architectural', zones: 'Front, Garage, Peaks', active: true },
    { id: 2, time: '11:30 PM', label: 'Every Day', scene: 'All Off', zones: 'All Zones', active: true },
    { id: 3, time: '5:00 PM', label: 'Nov 25 – Jan 2', scene: 'Christmas Classic', zones: 'All Zones', active: true },
    { id: 4, time: '6:00 PM', label: 'Every Sunday', scene: 'Game Day', zones: 'Front, Peaks', active: false },
    { id: 5, time: 'Away', label: 'When Away', scene: 'Security Sweep', zones: 'All Zones', active: false },
  ];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const scheduledDays = [1, 5, 8, 12, 14, 19, 20, 24, 25, 28, 29];

  function render() {
    const html = `
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

        <!-- Vacation Mode -->
        <div class="vacation-card">
          <div>
            <div style="font-weight: var(--fw-semibold);">🏖️ Vacation Mode</div>
            <div style="font-size: var(--fs-caption); color: var(--text-secondary);">Security lighting while away</div>
          </div>
          <label class="toggle">
            <input type="checkbox" />
            <div class="toggle-track"></div>
          </label>
        </div>

        ${viewMode === 'calendar' ? `
          <!-- Calendar -->
          <div style="text-align:center; margin-bottom: var(--space-md);">
            <span style="font-weight: var(--fw-semibold); font-size: var(--fs-heading);">${monthName}</span>
          </div>
          <div class="calendar-grid">
            ${['S','M','T','W','T','F','S'].map(d => `<div class="cal-header">${d}</div>`).join('')}
            ${Array(firstDay).fill('<div class="cal-day empty"></div>').join('')}
            ${Array.from({length: daysInMonth}, (_, i) => {
              const day = i + 1;
              const isToday = day === now.getDate();
              const hasEvent = scheduledDays.includes(day);
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
            <div class="schedule-card">
              <div class="schedule-time">
                <div class="schedule-time-value">${s.time.length <= 6 ? s.time : s.time.split(' ')[0]}</div>
                <div class="schedule-time-label">${s.time.length > 6 ? s.time.split(' ')[1] || '' : ''}</div>
              </div>
              <div class="schedule-info">
                <div class="schedule-scene-name">${s.scene}</div>
                <div class="schedule-meta">${s.label} · ${s.zones}</div>
              </div>
              <label class="toggle">
                <input type="checkbox" ${s.active ? 'checked' : ''} />
                <div class="toggle-track"></div>
              </label>
            </div>
          `).join('')}
        </div>

        <!-- Smart Suggestions -->
        <div class="section-label" style="margin-top: var(--space-lg);">Smart Suggestions</div>
        <div class="ai-card">
          <div class="ai-card-header">
            <span class="ai-card-icon">🌅</span>
            <div>
              <div class="ai-card-title">Auto Sunset Lighting</div>
            </div>
          </div>
          <div class="ai-card-desc">Sunset is at 7:52 PM today. Turn on Warm Architectural automatically?</div>
          <div class="ai-card-actions">
            <button class="btn btn-primary btn-sm">Schedule It</button>
            <button class="btn btn-ghost btn-sm">Dismiss</button>
          </div>
        </div>

        <div style="height: 24px;"></div>
      </div>
    `;
    container.innerHTML = html;

    // View toggle
    container.querySelectorAll('.schedule-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        viewMode = btn.dataset.view;
        render();
      });
    });
  }

  render();
}
