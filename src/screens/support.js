export function renderSupport(container, state) {
  const html = `
    <div class="screen" id="screen-support">
      <div class="screen-header">
        <h1 class="screen-title">System</h1>
        <button class="btn-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
      </div>

      <!-- System Health Overview -->
      <div class="system-health-card">
        <div class="system-overall">
          <div class="system-overall-icon good">✅</div>
          <div>
            <div class="system-overall-title">All Systems Healthy</div>
            <div class="system-overall-sub">Last checked 2 min ago</div>
          </div>
        </div>
        <div class="health-item">
          <div class="health-icon good">📡</div>
          <div class="health-info">
            <div class="health-label">Controller</div>
            <div class="health-value">Main Controller · v2.4.1</div>
          </div>
          <span class="health-status good">Online</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">📶</div>
          <div class="health-info">
            <div class="health-label">Wi-Fi Signal</div>
            <div class="health-value">-42 dBm · Strong</div>
          </div>
          <span class="health-status good">Strong</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">☁️</div>
          <div class="health-info">
            <div class="health-label">Cloud Connection</div>
            <div class="health-value">Remote access enabled</div>
          </div>
          <span class="health-status good">Connected</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">💡</div>
          <div class="health-info">
            <div class="health-label">LED Data Signal</div>
            <div class="health-value">478 LEDs responding</div>
          </div>
          <span class="health-status good">OK</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">🔌</div>
          <div class="health-info">
            <div class="health-label">Power Supply</div>
            <div class="health-value">350W · Normal load</div>
          </div>
          <span class="health-status good">Normal</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">🌡️</div>
          <div class="health-info">
            <div class="health-label">Controller Temp</div>
            <div class="health-value">38°C · Normal range</div>
          </div>
          <span class="health-status good">Normal</span>
        </div>
      </div>

      <!-- Firmware Update -->
      <div class="card" style="margin-bottom: var(--space-md); border-color: var(--accent); background: var(--accent-subtle);">
        <div style="display:flex; align-items:center; gap: var(--space-md);">
          <div style="font-size:24px;">⬆️</div>
          <div style="flex:1;">
            <div style="font-weight: var(--fw-semibold);">Firmware Update Available</div>
            <div style="font-size: var(--fs-small); color: var(--text-secondary);">v2.5.0 — Bug fixes & new animations</div>
          </div>
          <button class="btn btn-primary btn-sm">Update</button>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section-label">Quick Actions</div>
      <div class="support-actions stagger">
        <div class="support-action-card">
          <div class="support-action-icon">🔄</div>
          <div class="support-action-label">Restart Controller</div>
        </div>
        <div class="support-action-card">
          <div class="support-action-icon">🔍</div>
          <div class="support-action-label">Run Diagnostics</div>
        </div>
        <div class="support-action-card">
          <div class="support-action-icon">📋</div>
          <div class="support-action-label">Share Diagnostics</div>
        </div>
        <div class="support-action-card">
          <div class="support-action-icon">🧪</div>
          <div class="support-action-label">Test All Zones</div>
        </div>
      </div>

      <!-- Help & Support -->
      <div class="section-label" style="margin-top: var(--space-md);">Help & Support</div>
      <div style="display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-md);">
        <button class="zone-btn">
          <div style="font-size:18px;">📖</div>
          <div class="zone-btn-info">
            <div class="zone-btn-name">Quick Start Guide</div>
            <div class="zone-btn-detail">Learn the basics</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="zone-btn">
          <div style="font-size:18px;">🎬</div>
          <div class="zone-btn-info">
            <div class="zone-btn-name">Video Tutorials</div>
            <div class="zone-btn-detail">Step-by-step walkthroughs</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="zone-btn">
          <div style="font-size:18px;">🔧</div>
          <div class="zone-btn-info">
            <div class="zone-btn-name">Troubleshooting Wizard</div>
            <div class="zone-btn-detail">Fix common issues step by step</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="zone-btn">
          <div style="font-size:18px;">💬</div>
          <div class="zone-btn-info">
            <div class="zone-btn-name">Contact Support</div>
            <div class="zone-btn-detail">Chat, email, or call</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="zone-btn">
          <div style="font-size:18px;">🎫</div>
          <div class="zone-btn-info">
            <div class="zone-btn-name">Submit a Ticket</div>
            <div class="zone-btn-detail">We'll follow up by email</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- Sharing Section -->
      <div class="section-label" style="margin-top: var(--space-md);">People & Sharing</div>
      <div class="member-card">
        <div class="member-avatar" style="background: var(--accent-subtle); color: var(--accent);">JS</div>
        <div class="member-info">
          <div class="member-name">Jannis Schmidt</div>
          <div class="member-role">jannis@email.com</div>
        </div>
        <span class="role-badge owner">Owner</span>
      </div>
      <div class="member-card">
        <div class="member-avatar" style="background: hsla(210,80%,60%,0.12); color: var(--status-info);">AS</div>
        <div class="member-info">
          <div class="member-name">Alex Schmidt</div>
          <div class="member-role">Family Member</div>
        </div>
        <span class="role-badge">Family</span>
      </div>
      <button class="btn btn-secondary btn-block" style="margin-top: var(--space-sm); margin-bottom: var(--space-lg);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Invite Someone
      </button>

      <div style="height: 24px;"></div>
    </div>
  `;
  container.innerHTML = html;
}
