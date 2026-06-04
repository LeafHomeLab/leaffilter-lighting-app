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
import { renderPatternEditor } from './screens/patternEditor.js';
import { syncFabColor, showToast } from './utils.js';
import { connect } from './api.js';


// ===== STATE PERSISTENCE =====
const PERSIST_KEY = 'lf_state_v1';
const STATE_VERSION = 1;
const RECENT_COLORS_CAP = 16;

const PERSIST_FIELDS = [
  'lightsOn', 'brightness', 'activeScene', 'activeColor',
  'selectedMovement', 'recentColors', 'activeZones',
  'schedules', 'vacationActive', 'vacationScene',
  'vacationBehavior', 'vacationOnTime', 'vacationOffTime',
];

/**
 * Persistence strategy: whitelist of fields saved to a single localStorage key.
 * Autosaves every 2s via setInterval + on tab close via beforeunload.
 * allZones stores only { id, active } so new zones added in future versions
 * automatically appear with their default active value rather than being dropped.
 * Version mismatch discards stale data so schema changes never corrupt state.
 */
function saveState(state) {
  try {
    const snapshot = { _version: STATE_VERSION };
    for (const key of PERSIST_FIELDS) {
      snapshot[key] = state[key];
    }
    snapshot.allZones = state.allZones.map(z => ({ id: z.id, active: z.active }));
    if (Array.isArray(snapshot.recentColors)) {
      snapshot.recentColors = snapshot.recentColors.slice(0, RECENT_COLORS_CAP);
    }
    localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('lf: state save failed', err);
  }
}

function loadPersistedState(defaultZones) {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return {};
    const { _version, allZones: storedZones, ...data } = JSON.parse(raw);
    if (_version !== STATE_VERSION) {
      console.info('lf: persisted state version mismatch — resetting to defaults');
      localStorage.removeItem(PERSIST_KEY);
      return {};
    }
    if (storedZones) {
      const activeMap = Object.fromEntries(storedZones.map(z => [z.id, z.active]));
      data.allZones = defaultZones.map(z => ({
        ...z,
        active: z.id in activeMap ? activeMap[z.id] : z.active,
      }));
      data.activeZones = data.allZones.filter(z => z.active).map(z => z.id);
    }
    return data;
  } catch (err) {
    console.warn('lf: state load failed', err);
    return {};
  }
}

// ===== APP STATE =====
const DEFAULT_ZONES = [
  { id: 'front',     name: 'Front Roofline', leds: 148, active: true  },
  { id: 'garage',    name: 'Garage',         leds: 52,  active: true  },
  { id: 'peaks',     name: 'Peaks',          leds: 36,  active: true  },
  { id: 'left',      name: 'Left Side',      leds: 64,  active: true  },
  { id: 'right',     name: 'Right Side',     leds: 58,  active: false },
  { id: 'back',      name: 'Backyard',       leds: 96,  active: false },
  { id: 'patio',     name: 'Patio',          leds: 44,  active: false },
  { id: 'landscape', name: 'Landscape',      leds: 80,  active: false },
];

const state = {
  // Core light state
  currentScreen: 'home',
  lightsOn: true,
  brightness: 75,
  activeScene: 'Warm Architectural',
  activeColor: null,
  selectedMovement: 'Stationary',
  recentColors: null,

  // Zone config
  activeZones: ['front', 'garage', 'peaks', 'left'],
  allZones: DEFAULT_ZONES.map(z => ({ ...z })),

  // Control screen
  controlBaseScene: null,

  // Scenes screen
  editingScene: null,
  scenesTargetCategory: 'your-patterns',

  // Schedule screen
  schedules: [],
  vacationActive: false,
  vacationScene: null,
  vacationBehavior: 'random',
  vacationOnTime: '18:00',
  vacationOffTime: '23:00',
};

// Persisted values win; new keys added to the initial state keep their defaults
Object.assign(state, loadPersistedState(DEFAULT_ZONES));

// ===== ROUTER =====
const screens = {
  home: renderHome,
  scenes: renderScenes,
  schedule: renderSchedule,
  zones: renderZones,
  support: renderSupport,
  control: renderControl,
  onboarding: renderOnboarding,
  patternEditor: renderPatternEditor,
};

function navigate(screen) {
  if (!screens[screen]) {
    console.error(`navigate: unknown screen "${screen}"`);
    return;
  }
  state.currentScreen = screen;
  const content = document.getElementById('screen-content');
  content.innerHTML = '';
  screens[screen](content, state, navigate);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screen);
  });

  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = (screen === 'onboarding' || screen === 'patternEditor') ? 'none' : '';
}

// ===== FAB =====
function updateFabAppearance() {
  const fab = document.getElementById('nav-control');
  if (!fab) return;
  if (state.lightsOn) {
    fab.classList.remove('lights-off');
    if (state.activeColor) {
      syncFabColor(state.activeColor);
    } else {
      // No active color yet — clear any stale inline styles, let CSS accent show
      fab.style.removeProperty('--fab-color');
      fab.style.removeProperty('--fab-glow');
      fab.style.background = '';
      fab.style.boxShadow = '';
    }
  } else {
    fab.classList.add('lights-off');
    fab.style.setProperty('--fab-color', '#111122');
    fab.style.setProperty('--fab-glow', 'rgba(0,0,0,0)');
    fab.style.background = '#111122';
    fab.style.boxShadow = '0 0 0 2px var(--bg-primary), 0 6px 20px rgba(0,0,0,0.5)';
  }
}

// ===== INIT =====
function init() {
  setInterval(() => saveState(state), 2000);
  window.addEventListener('beforeunload', () => saveState(state));

  const updateTime = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const el = document.getElementById('status-time');
    if (el) el.textContent = `${h}:${m}`;
  };
  updateTime();
  setInterval(updateTime, 30000);

  document.querySelectorAll('.nav-item:not(.nav-fab)').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.screen));
  });

  document.querySelector('#nav-control')?.addEventListener('click', () => {
    state.lightsOn = !state.lightsOn;
    updateFabAppearance();
    showToast(state.lightsOn ? 'Lights on' : 'Lights off');
  });

  const onboarded = localStorage.getItem('lf_onboarded');
  navigate(onboarded ? 'home' : 'onboarding');

  const savedIp = localStorage.getItem('leaflight_hub_ip');
  if (savedIp) {
    connect(savedIp).then(res => {
      if (res.connected) {
        console.log(`[Main] Auto-connected to WLED controller at ${savedIp}`);
        showToast('Connected to lighting controller');
      } else {
        console.warn(`[Main] Auto-connect failed for ${savedIp}`);
      }
    });
  }

  updateFabAppearance();
}

document.addEventListener('DOMContentLoaded', init);
