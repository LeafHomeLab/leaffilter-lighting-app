import './styles/fonts.css';
import './styles/design-system.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/animations.css';
import { renderHome } from './screens/home.js';
import { renderScenes } from './screens/scenes.js';
import { renderSchedule } from './screens/schedule.js';
import { renderZones } from './screens/zones.js';
import { renderSupport } from './screens/support.js';
import { renderControl } from './screens/control.js';
import { renderOnboarding } from './screens/onboarding.js';

// ===== APP STATE =====
const state = {
  currentScreen: 'home',
  lightsOn: true,
  brightness: 75,
  activeScene: 'Warm Architectural',
  activeZones: ['front', 'garage', 'peaks', 'left'],
  allZones: [
    { id: 'front', name: 'Front Roofline', leds: 148, active: true },
    { id: 'garage', name: 'Garage', leds: 52, active: true },
    { id: 'peaks', name: 'Peaks', leds: 36, active: true },
    { id: 'left', name: 'Left Side', leds: 64, active: true },
    { id: 'right', name: 'Right Side', leds: 58, active: false },
    { id: 'back', name: 'Backyard', leds: 96, active: false },
    { id: 'patio', name: 'Patio', leds: 44, active: false },
    { id: 'landscape', name: 'Landscape', leds: 80, active: false },
  ],
};

// ===== ROUTER =====
const screens = {
  home: renderHome,
  scenes: renderScenes,
  schedule: renderSchedule,
  zones: renderZones,
  support: renderSupport,
  control: renderControl,
  onboarding: renderOnboarding,
};

function navigate(screen) {
  if (!screens[screen]) return;
  state.currentScreen = screen;
  const content = document.getElementById('screen-content');
  content.innerHTML = '';
  screens[screen](content, state, navigate);

  // Update nav active state — FAB and regular items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screen);
  });

  // Show/hide bottom nav (hide on onboarding)
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = screen === 'onboarding' ? 'none' : '';
}

// ===== INIT =====
function init() {
  // Live clock
  const updateTime = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const el = document.getElementById('status-time');
    if (el) el.textContent = `${h}:${m}`;
  };
  updateTime();
  setInterval(updateTime, 30000);

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.screen));
  });

  // Show onboarding on first launch, otherwise go to home
  const onboarded = localStorage.getItem('lf_onboarded');
  navigate(onboarded ? 'home' : 'onboarding');
}

document.addEventListener('DOMContentLoaded', init);
