import { connect, getHubAddress, HARDWARE_CONNECTED, getStatus } from '../api.js';
import { showToast } from '../utils.js';

export function renderSupport(container, state) {
  const isConnected = HARDWARE_CONNECTED;
  const currentIp = getHubAddress();

  const html = `
    <div class="screen" id="screen-support">
      <div class="screen-header">
        <h1 class="screen-title">System</h1>
        <button class="btn-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
      </div>

      <!-- Hardware Integration Configuration -->
      <div class="section-label">Controller Integration</div>
      <div class="card" style="margin-bottom: var(--space-md); border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); padding: var(--space-md);">
        <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: var(--fw-semibold); font-size: var(--fs-body); color: var(--text-primary);">WLED Controller IP</span>
            <span id="hub-connection-status" class="health-status ${isConnected ? 'good' : 'bad'}" style="font-size: var(--fs-xs); font-weight: var(--fw-semibold); text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 8px; border-radius: 20px; background: ${isConnected ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)'}; color: ${isConnected ? '#2ecc71' : '#e74c3c'};">
              ${isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div style="display: flex; gap: var(--space-sm); margin-top: 4px;">
            <input type="text" id="input-hub-ip" value="${currentIp}" placeholder="e.g. 192.168.1.42" style="flex: 1; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: var(--space-sm); background: rgba(0,0,0,0.2); color: var(--text-primary); font-size: var(--fs-small); font-family: monospace;" />
            <button id="btn-save-ip" class="btn btn-primary" style="padding: 0 var(--space-md); font-size: var(--fs-small); height: 38px;">Connect</button>
          </div>
          <div style="font-size: var(--fs-xs); color: var(--text-tertiary); line-height: 1.4;">
            Type in the IP address of your ESP32/QuinLED board to control physical lights.
          </div>
        </div>
      </div>

      <!-- System Health Overview -->
      <div class="system-health-card">
        <div class="system-overall">
          <div class="system-overall-icon ${isConnected ? 'good' : 'warning'}" id="health-overall-icon">${isConnected ? '✅' : '⚠️'}</div>
          <div>
            <div class="system-overall-title" id="health-overall-title">${isConnected ? 'All Systems Healthy' : 'Running in Demo Mode'}</div>
            <div class="system-overall-sub" id="health-overall-sub">${isConnected ? 'Hardware active' : 'Virtual lights only'}</div>
          </div>
        </div>
        <div class="health-item">
          <div class="health-icon ${isConnected ? 'good' : 'bad'}" id="health-icon-controller">📡</div>
          <div class="health-info">
            <div class="health-label">Controller</div>
            <div class="health-value" id="health-val-controller">${isConnected ? 'WLED Hub' : 'Main Controller · Disconnected'}</div>
          </div>
          <span class="health-status ${isConnected ? 'good' : 'bad'}" id="health-status-controller">${isConnected ? 'Online' : 'Offline'}</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">📶</div>
          <div class="health-info">
            <div class="health-label">Wi-Fi Signal</div>
            <div class="health-value" id="health-val-wifi">${isConnected ? '-55 dBm · Stable' : 'Local Host · Strong'}</div>
          </div>
          <span class="health-status good">Strong</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">☁️</div>
          <div class="health-info">
            <div class="health-label">Cloud Connection</div>
            <div class="health-value">Virtual cloud relay active</div>
          </div>
          <span class="health-status good">Connected</span>
        </div>
        <div class="health-item">
          <div class="health-icon ${isConnected ? 'good' : 'warning'}" id="health-icon-led">💡</div>
          <div class="health-info">
            <div class="health-label">LED Data Signal</div>
            <div class="health-value" id="health-val-leds">${isConnected ? 'Ready' : 'Virtual simulator active'}</div>
          </div>
          <span class="health-status ${isConnected ? 'good' : 'warning'}" id="health-status-leds">${isConnected ? 'OK' : 'Virtual'}</span>
        </div>
        <div class="health-item">
          <div class="health-icon good">🔌</div>
          <div class="health-info">
            <div class="health-label">Power Supply</div>
            <div class="health-value">Power monitor standard</div>
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

  const btnSave = container.querySelector('#btn-save-ip');
  const inputIp = container.querySelector('#input-hub-ip');
  const statusEl = container.querySelector('#hub-connection-status');

  // Diagnostic items to update dynamically on connection
  const overallIcon = container.querySelector('#health-overall-icon');
  const overallTitle = container.querySelector('#health-overall-title');
  const overallSub = container.querySelector('#health-overall-sub');
  const controllerIcon = container.querySelector('#health-icon-controller');
  const controllerVal = container.querySelector('#health-val-controller');
  const controllerStatus = container.querySelector('#health-status-controller');
  const wifiVal = container.querySelector('#health-val-wifi');
  const ledIcon = container.querySelector('#health-icon-led');
  const ledVal = container.querySelector('#health-val-leds');
  const ledStatus = container.querySelector('#health-status-leds');

  if (btnSave && inputIp && statusEl) {
    btnSave.addEventListener('click', async () => {
      const ip = inputIp.value.trim();
      if (!ip) {
        showToast('Please enter a valid IP address');
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Connecting...';
      statusEl.textContent = 'Testing...';
      statusEl.style.background = 'rgba(241,196,15,0.15)';
      statusEl.style.color = '#f1c40f';

      try {
        const res = await connect(ip);
        if (res.connected) {
          statusEl.textContent = 'Connected';
          statusEl.style.background = 'rgba(46,204,113,0.15)';
          statusEl.style.color = '#2ecc71';
          statusEl.className = 'health-status good';

          // Update System Diagnostic Cards
          if (overallIcon) overallIcon.textContent = '✅';
          if (overallIcon) overallIcon.className = 'system-overall-icon good';
          if (overallTitle) overallTitle.textContent = 'All Systems Healthy';
          if (overallSub) overallSub.textContent = 'Hardware active';

          if (controllerIcon) controllerIcon.className = 'health-icon good';
          if (controllerVal) controllerVal.textContent = `WLED Hub · v${res.firmwareVersion}`;
          if (controllerStatus) {
            controllerStatus.textContent = 'Online';
            controllerStatus.className = 'health-status good';
          }

          if (wifiVal) wifiVal.textContent = '-55 dBm · Stable';

          if (ledIcon) ledIcon.className = 'health-icon good';
          if (ledVal) ledVal.textContent = `${res.ledCount} LEDs responding`;
          if (ledStatus) {
            ledStatus.textContent = 'OK';
            ledStatus.className = 'health-status good';
          }

          showToast('Successfully paired with controller!');
        } else {
          statusEl.textContent = 'Offline';
          statusEl.style.background = 'rgba(231,76,60,0.15)';
          statusEl.style.color = '#e74c3c';
          statusEl.className = 'health-status bad';

          // Revert to demo mode settings
          if (overallIcon) overallIcon.textContent = '⚠️';
          if (overallIcon) overallIcon.className = 'system-overall-icon warning';
          if (overallTitle) overallTitle.textContent = 'Running in Demo Mode';
          if (overallSub) overallSub.textContent = 'Virtual lights only';

          if (controllerIcon) controllerIcon.className = 'health-icon bad';
          if (controllerVal) controllerVal.textContent = 'Main Controller · Disconnected';
          if (controllerStatus) {
            controllerStatus.textContent = 'Offline';
            controllerStatus.className = 'health-status bad';
          }

          if (wifiVal) wifiVal.textContent = 'Local Host · Strong';

          if (ledIcon) ledIcon.className = 'health-icon warning';
          if (ledVal) ledVal.textContent = 'Virtual simulator active';
          if (ledStatus) {
            ledStatus.textContent = 'Virtual';
            ledStatus.className = 'health-status warning';
          }

          showToast('Could not reach controller. Demo mode active.');
        }
      } catch (err) {
        statusEl.textContent = 'Offline';
        statusEl.style.background = 'rgba(231,76,60,0.15)';
        statusEl.style.color = '#e74c3c';
        showToast('Connection failed.');
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Connect';
      }
    });
  }
}
