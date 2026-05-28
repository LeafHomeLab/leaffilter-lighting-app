import { scenes } from '../data/scenes.js';
import { startRooflinePreview } from '../utils/rooflinePreview.js';

const ANIMATIONS = ['Static', 'Chase', 'Wave', 'Fade', 'Twinkle', 'Sparkle', 'Bounce', 'Pulse', 'Gradient', 'Alternating'];

const PALETTE = [
  // Whites & warm
  '#FFFFFF', '#FFF8E7', '#FFE0B2', '#FFD4A3',
  // Cool whites & sky
  '#E8EAF6', '#B3D4FF', '#87CEEB', '#B2EBF2',
  // Reds
  '#FF0000', '#D50000', '#FF5252', '#FFCDD2',
  // Oranges
  '#FF6D00', '#FF8C00', '#FFAB40', '#FFD180',
  // Yellows
  '#FFD600', '#FFEB3B', '#FFF176', '#FFF9C4',
  // Greens
  '#00C853', '#4CAF50', '#66BB6A', '#A5D6A7',
  // Blues
  '#1565C0', '#1E88E5', '#42A5F5', '#90CAF9',
  // Purples
  '#6A1B9A', '#9C27B0', '#AB47BC', '#CE93D8',
  // Pinks
  '#E91E63', '#F06292', '#F48FB1', '#FCE4EC',
  // Neutrals
  '#212121', '#424242', '#757575', '#BDBDBD',
];

export function renderPatternEditor(container, state, navigate) {
  const base = state.editingScene ?? null;
  const isOwnPattern = base?.categoryId === 'your-patterns';

  // Editable local state — mutable copy of the base scene (or blank if creating new)
  let editColors    = base ? [...base.colors]                                         : ['#FF0000', '#FFFFFF', '#0000FF'];
  let editName      = base ? (isOwnPattern ? base.name : `${base.name} — Custom`)    : 'My Pattern';
  let editAnimation = base ? (base.animation ?? 'Chase')                              : 'Chase';
  let editDirection = base ? (base.direction ?? 'forward')                            : 'forward';
  let editSpeed     = base ? (base.speed ?? 3)                                        : 3;

  let selectedSlot  = null; // which color circle is being edited
  let stopPreview   = () => {};

  function render() {
    stopPreview();
    const isStatic = editAnimation === 'Static';

    container.innerHTML = `
      <div class="screen pe-screen">

        <!-- Header -->
        <div class="screen-header">
          <button class="btn-icon" id="pe-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 class="screen-title" style="flex:1; text-align:center; font-size:20px;">
            ${isOwnPattern ? 'Edit Pattern' : 'New Pattern'}
          </h1>
          <div style="width:44px; flex-shrink:0;"></div>
        </div>

        <!-- Live roofline preview -->
        <canvas id="pe-canvas" width="358" height="140"
          style="width:100%; height:140px; display:block; border-radius:var(--radius-lg); margin-bottom:8px;"></canvas>

        <!-- Palette dots -->
        <div class="led-dots-row" style="border-radius:var(--radius-full); margin-bottom:var(--space-md);">
          ${editColors.map(c =>
            `<div class="led-dot" style="background:${c}; box-shadow:0 0 6px ${c}80;"></div>`
          ).join('')}
        </div>

        <!-- Name -->
        <div class="pe-field">
          <label class="pe-label">Name</label>
          <input class="pe-input" id="pe-name" type="text" value="${editName}" placeholder="Pattern name" />
        </div>

        <!-- Color slots -->
        <div class="pe-field">
          <label class="pe-label">Colors — tap to change</label>
          <div class="pe-color-row">
            ${editColors.map((c, i) => `
              <div class="pe-color-wrap">
                <button class="pe-color-btn" data-slot="${i}" style="background:${c}; box-shadow:0 0 14px ${c}50;">
                </button>
                ${editColors.length > 1 ? `
                  <button class="pe-color-remove" data-remove="${i}" title="Remove">×</button>
                ` : ''}
              </div>
            `).join('')}
            ${editColors.length < 8 ? `
              <button class="pe-color-add" id="pe-add-color">+</button>
            ` : ''}
          </div>
        </div>

        <!-- Animation -->
        <div class="pe-field">
          <label class="pe-label">Animation</label>
          <div class="pe-anim-row">
            ${ANIMATIONS.map(a => `
              <button class="pe-anim-chip ${editAnimation === a ? 'active' : ''}" data-anim="${a}">${a}</button>
            `).join('')}
          </div>
        </div>

        <!-- Direction (hidden when Static) -->
        ${!isStatic ? `
          <div class="pe-field">
            <label class="pe-label">Direction</label>
            <div class="pe-dir-row">
              <button class="pe-dir-btn ${editDirection !== 'reverse' ? 'active' : ''}" data-dir="forward">→ Forward</button>
              <button class="pe-dir-btn ${editDirection === 'reverse' ? 'active' : ''}" data-dir="reverse">← Reverse</button>
            </div>
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="pe-actions">
          <button class="btn btn-primary btn-block" id="pe-save">
            ${isOwnPattern ? 'Update Pattern' : 'Save to Your Patterns'}
          </button>
          ${isOwnPattern ? `
            <button class="pe-delete-btn" id="pe-delete">Remove Pattern</button>
          ` : ''}
        </div>

        <div style="height:32px;"></div>
      </div>
    `;

    // Start live canvas preview
    const canvas = container.querySelector('#pe-canvas');
    if (canvas) {
      stopPreview = startRooflinePreview(canvas, {
        colors: editColors,
        animation: editAnimation,
        direction: editDirection,
        speed: editAnimation === 'Static' ? 0 : editSpeed,
      });
    }

    attachEvents();
  }

  function attachEvents() {
    container.querySelector('#pe-back')?.addEventListener('click', () => {
      stopPreview();
      state.editingScene = null;
      navigate('scenes');
    });

    container.querySelector('#pe-name')?.addEventListener('input', e => {
      editName = e.target.value;
    });

    // Tap color circle → open picker
    container.querySelectorAll('.pe-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedSlot = parseInt(btn.dataset.slot);
        openColorPicker();
      });
    });

    // Remove color ×
    container.querySelectorAll('.pe-color-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.remove);
        if (editColors.length > 1) {
          editColors.splice(idx, 1);
          render();
        }
      });
    });

    // Add color slot
    container.querySelector('#pe-add-color')?.addEventListener('click', () => {
      selectedSlot = editColors.length; // new slot index
      openColorPicker();
    });

    // Animation chips
    container.querySelectorAll('.pe-anim-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        editAnimation = btn.dataset.anim;
        if (editAnimation === 'Static') editSpeed = 0;
        else if (!editSpeed) editSpeed = 3;
        render();
      });
    });

    // Direction
    container.querySelectorAll('.pe-dir-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        editDirection = btn.dataset.dir;
        container.querySelectorAll('.pe-dir-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.dir === editDirection)
        );
      });
    });

    // Save
    container.querySelector('#pe-save')?.addEventListener('click', savePattern);

    // Delete (only for own patterns)
    container.querySelector('#pe-delete')?.addEventListener('click', deletePattern);
  }

  function openColorPicker() {
    const overlay = document.createElement('div');
    overlay.className = 'cpicker-overlay';
    overlay.innerHTML = `
      <div class="cpicker-sheet">
        <div class="cpicker-handle"></div>
        <div class="cpicker-title">Choose Color</div>
        <div class="cpicker-grid">
          ${PALETTE.map(c => `
            <button class="cpicker-swatch" data-pick="${c}" style="background:${c};"></button>
          `).join('')}
        </div>
        <div style="padding: 0 16px 16px;">
          <button class="btn btn-secondary btn-block" id="cpicker-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.getElementById('app-frame').appendChild(overlay);
    // Trigger CSS enter animation
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
      selectedSlot = null;
    };

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('#cpicker-cancel')?.addEventListener('click', close);

    overlay.querySelectorAll('.cpicker-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.pick;
        if (selectedSlot !== null) {
          if (selectedSlot < editColors.length) {
            editColors[selectedSlot] = color;
          } else {
            editColors.push(color);
          }
        }
        close();
        render();
      });
    });
  }

  function savePattern() {
    const nameInput = container.querySelector('#pe-name');
    const name = (nameInput?.value ?? editName).trim();
    if (!name) { showToast('Please enter a name'); return; }

    if (isOwnPattern && base) {
      // In-place update of the existing scene
      const scene = scenes.find(s => s.id === base.id);
      if (scene) {
        scene.name      = name;
        scene.colors    = [...editColors];
        scene.animation = editAnimation;
        scene.direction = editDirection;
        scene.speed     = editSpeed;
      }
    } else {
      // Create a new scene in Your Patterns
      scenes.push({
        id:        Date.now(),
        name,
        categoryId: 'your-patterns',
        colors:    [...editColors],
        animation: editAnimation,
        direction: editDirection,
        speed:     editSpeed,
        favorite:  false,
      });
    }

    stopPreview();
    state.editingScene = null;
    state.scenesTargetCategory = 'your-patterns';
    showToast(`Saved: ${name}`);
    setTimeout(() => navigate('scenes'), 400);
  }

  function deletePattern() {
    if (!isOwnPattern || !base) return;
    const idx = scenes.findIndex(s => s.id === base.id);
    if (idx !== -1) scenes.splice(idx, 1);
    stopPreview();
    state.editingScene = null;
    state.scenesTargetCategory = 'your-patterns';
    navigate('scenes');
  }

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.getElementById('app-frame').appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  render();
}
