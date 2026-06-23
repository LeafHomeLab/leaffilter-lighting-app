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
import { connect, setLightsOn, reconcileZonesWithHardware } from './api.js';


// ===== STATE PERSISTENCE =====
const PERSIST_KEY    = 'lf_state_v2';
const V1_PERSIST_KEY = 'lf_state_v1';
const STATE_VERSION  = 2;
const RECENT_COLORS_CAP = 16;

// activeZones is derived; allZones lives in controllers — neither is persisted directly
const PERSIST_FIELDS = [
  'lightsOn', 'brightness', 'activeScene', 'activeColor',
  'selectedMovement', 'recentColors',
  'schedules', 'vacationActive', 'vacationScene',
  'vacationBehavior', 'vacationOnTime', 'vacationOffTime',
];

function saveState(state) {
  try {
    const snapshot = { _version: STATE_VERSION };
    for (const key of PERSIST_FIELDS) {
      snapshot[key] = state[key];
    }
    // Full zone structure is persisted: zones may come from hardware detection
    // (reconcileZonesWithHardware), so they can't be rebuilt from code defaults
    snapshot.controllers = state.controllers.map(ctrl => ({
      id: ctrl.id,
      name: ctrl.name,
      ip: ctrl.ip,
      zones: ctrl.zones.map(z => ({ ...z })),
    }));
    if (Array.isArray(snapshot.recentColors)) {
      snapshot.recentColors = snapshot.recentColors.slice(0, RECENT_COLORS_CAP);
    }
    localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('lf: state save failed', err);
  }
}

// Pulls active-zone flags from v1 snapshot so the user's toggle state survives the upgrade
function migrateFromV1(defaultControllers) {
  try {
    const raw = localStorage.getItem(V1_PERSIST_KEY);
    if (!raw) return null;
    const { _version, allZones: storedZones, activeZones, ...data } = JSON.parse(raw);
    if (_version !== 1) return null;
    console.info('lf: migrating persisted state v1 → v2');
    const activeMap = {};
    if (storedZones) {
      for (const z of storedZones) activeMap[z.id] = z.active;
    }
    const controllers = defaultControllers.map(ctrl => ({
      ...ctrl,
      zones: ctrl.zones.map(z => ({
        ...z,
        active: z.id in activeMap ? activeMap[z.id] : z.active,
      })),
    }));
    localStorage.removeItem(V1_PERSIST_KEY);
    return { ...data, controllers };
  } catch (err) {
    console.warn('lf: v1 migration failed', err);
    return null;
  }
}

function loadPersistedState(defaultControllers) {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return migrateFromV1(defaultControllers) ?? {};
    const { _version, controllers: savedControllers, ...data } = JSON.parse(raw);
    if (_version !== STATE_VERSION) {
      console.info('lf: persisted state version mismatch — resetting to defaults');
      localStorage.removeItem(PERSIST_KEY);
      return {};
    }
    if (savedControllers) {
      const isFullShape = savedControllers.every(c =>
        Array.isArray(c.zones) && c.zones.every(z => z.segId != null && z.name));
      if (isFullShape) {
        // Snapshot carries the complete zone structure (post hardware-detection
        // builds) — restore it verbatim; reconcile-on-connect re-syncs later
        data.controllers = savedControllers.map(ctrl => ({
          ...ctrl,
          zones: ctrl.zones.map(z => ({ ...z })),
        }));
      } else {
        // Legacy snapshot: only mutable per-zone fields were saved — re-hydrate
        // against current code defaults
        const zoneOverrides = {};
        for (const ctrl of savedControllers) {
          for (const z of ctrl.zones) zoneOverrides[z.id] = z;
        }
        data.controllers = defaultControllers.map(ctrl => ({
          ...ctrl,
          zones: ctrl.zones.map(z => {
            const saved = zoneOverrides[z.id];
            if (!saved) return { ...z };
            return {
              ...z,
              active:     saved.active,
              color:      saved.color      ?? null,
              brightness: saved.brightness ?? null,
              scene:      saved.scene      ?? null,
            };
          }),
        }));
      }
    }
    return data;
  } catch (err) {
    console.warn('lf: state load failed', err);
    return {};
  }
}

// ===== APP STATE =====
// Demo-mode seed data ONLY. Once a controller is connected,
// reconcileZonesWithHardware replaces the zone list with what's actually wired
// (one zone per physical output) — these names/counts never reach a real install.
const DEFAULT_CONTROLLERS = [
  {
    id: 'ctrl-main',
    name: 'Main House',
    ip: '',
    zones: [
      { id: 'front',  name: 'Front Roofline', shortName: 'Front',  leds: 148, segId: 0, active: true,  color: null, brightness: null, scene: null },
      { id: 'garage', name: 'Garage',         shortName: 'Garage', leds: 52,  segId: 1, active: true,  color: null, brightness: null, scene: null },
      { id: 'peaks',  name: 'Peaks',          shortName: 'Peaks',  leds: 36,  segId: 2, active: true,  color: null, brightness: null, scene: null },
      { id: 'left',   name: 'Left Side',      shortName: 'Left',   leds: 64,  segId: 3, active: true,  color: null, brightness: null, scene: null },
    ],
  },
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

  // Source of truth for zone data — screens use allZones / activeZones getters below
  controllers: DEFAULT_CONTROLLERS.map(ctrl => ({
    ...ctrl,
    zones: ctrl.zones.map(z => ({ ...z })),
  })),

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

// Computed views over controllers.zones — all existing screen files continue to work
// unchanged. No-op setters prevent throws when legacy code assigns to these properties.
Object.defineProperties(state, {
  allZones: {
    get()  { return this.controllers.flatMap(c => c.zones); },
    set()  {},
    enumerable: false,
    configurable: true,
  },
  activeZones: {
    get()  { return this.controllers.flatMap(c => c.zones).filter(z => z.active).map(z => z.id); },
    set()  {},
    enumerable: false,
    configurable: true,
  },
});

// Persisted values win; new keys added to the initial state keep their defaults
Object.assign(state, loadPersistedState(DEFAULT_CONTROLLERS));

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
  window.addEventListener('lf:save-state', () => saveState(state));

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
    setLightsOn(state.lightsOn);
    updateFabAppearance();
    showToast(state.lightsOn ? 'Lights on' : 'Lights off');
  });

  navigate('onboarding');

  const savedIp = localStorage.getItem('leaflight_hub_ip');
  if (savedIp) {
    connect(savedIp).then(async res => {
      if (res.connected) {
        console.log(`[Main] Auto-connected to WLED controller at ${savedIp}`);
        showToast('Connected to lighting controller');
        // Hardware defines which zones exist — refresh the visible screen if it changed them
        const zoneCount = await reconcileZonesWithHardware(state);
        if (zoneCount != null) {
          console.log(`[Main] Detected ${zoneCount} zone(s) on controller`);
          // Don't stomp screens with in-progress local state (wizard steps, edits)
          if (state.currentScreen !== 'onboarding' && state.currentScreen !== 'patternEditor') {
            navigate(state.currentScreen);
          }
        }
      } else {
        console.warn(`[Main] Auto-connect failed for ${savedIp}`);
      }
    });
  }

  updateFabAppearance();
}

document.addEventListener('DOMContentLoaded', init);
