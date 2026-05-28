import { scenes, patternCategories } from '../data/scenes.js';
import { startRooflinePreview } from '../utils/rooflinePreview.js';

export function renderScenes(container, state, navigate) {
  let view = 'categories';
  let activeCategoryId = null;
  let stopPreviews = () => {};

  // Support auto-opening a specific category (e.g. after saving from the editor)
  if (state.scenesTargetCategory) {
    activeCategoryId = state.scenesTargetCategory;
    view = 'patterns';
    state.scenesTargetCategory = null;
  }

  function render() {
    stopPreviews();
    view === 'patterns' ? renderPatterns() : renderCategories();
  }

  function renderCategories() {
    const html = `
      <div class="screen" id="screen-scenes">
        <div class="screen-header">
          <h1 class="screen-title">Patterns</h1>
          <button class="btn-icon" id="add-scene-btn" title="Create custom pattern">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div class="scene-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search patterns..." id="scene-search-input" />
        </div>

        <div class="pattern-category-grid stagger" id="category-grid">
          ${patternCategories.map(cat => {
            const count = scenes.filter(s => s.categoryId === cat.id).length;
            return `
              <div class="pattern-category-cell" data-cat-id="${cat.id}">
                <div class="pattern-category-circle">${cat.icon}</div>
                <span class="pattern-category-name">${cat.name}</span>
                <span class="pattern-category-count">${count} Pattern${count !== 1 ? 's' : ''}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div style="height: 24px;"></div>
      </div>
    `;
    container.innerHTML = html;

    container.querySelector('#scene-search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.pattern-category-cell').forEach(cell => {
        const name = cell.querySelector('.pattern-category-name').textContent.toLowerCase();
        cell.style.display = name.includes(q) ? '' : 'none';
      });
    });

    container.querySelectorAll('.pattern-category-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        activeCategoryId = cell.dataset.catId;
        view = 'patterns';
        render();
      });
    });

    container.querySelector('#add-scene-btn')?.addEventListener('click', () => {
      state.editingScene = null;
      navigate('patternEditor');
    });
  }

  function renderPatterns() {
    const category = patternCategories.find(c => c.id === activeCategoryId);
    const filtered = scenes.filter(s => s.categoryId === activeCategoryId);
    const isYours = activeCategoryId === 'your-patterns';

    const html = `
      <div class="screen" id="screen-scenes">
        <div class="screen-header">
          <button class="btn-icon" id="back-btn" title="Back to categories">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 class="screen-title" style="flex:1; text-align:center; font-size:20px;">${category ? category.name : 'Patterns'}</h1>
          ${isYours ? `
            <button class="btn-icon" id="add-scene-btn" title="Create custom pattern">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          ` : '<div style="width:44px; flex-shrink:0;"></div>'}
        </div>

        <div class="scenes-grid stagger" id="scenes-grid">
          ${filtered.map(scene => {
            const dir = scene.direction ?? 'forward';
            const isAnimated = scene.animation !== 'Static' && scene.speed > 0;
            return `
              <div class="scene-card" data-scene-id="${scene.id}">
                <canvas class="pattern-preview-canvas" width="172" height="86"
                  style="width:100%; height:86px; display:block; border-radius:var(--radius-lg) var(--radius-lg) 0 0;"></canvas>

                <div class="led-dots-row">
                  ${scene.colors.map(c =>
                    `<div class="led-dot" style="background:${c}; box-shadow:0 0 5px ${c}80;"></div>`
                  ).join('')}
                </div>

                <div class="scene-card-body">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div class="scene-card-name">${scene.name}</div>
                    <button class="fav-btn" data-fav="${scene.id}"
                      style="font-size:16px; opacity:${scene.favorite ? 1 : 0.3}; padding:0; flex-shrink:0;">
                      ${scene.favorite ? '★' : '☆'}
                    </button>
                  </div>
                  <div class="scene-card-meta">
                    <span>${scene.animation}</span>
                    ${isAnimated ? `<span class="dir-indicator">${dir === 'reverse' ? '←' : '→'}</span>` : ''}
                  </div>
                  <div class="scene-card-actions">
                    <button class="scene-action-btn primary apply-scene-btn" data-id="${scene.id}">Apply</button>
                    <button class="scene-action-btn secondary edit-scene-btn" data-id="${scene.id}">Edit</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${filtered.length === 0 ? `
          <div style="text-align:center; padding: 48px 16px; color: var(--text-secondary);">
            <div style="font-size: 40px; margin-bottom: 12px;">🎨</div>
            <div style="font-weight: var(--fw-semibold); margin-bottom: 4px;">No patterns here yet</div>
            <div style="font-size: var(--fs-small);">Tap + to create your first pattern</div>
          </div>
        ` : ''}

        <div style="height: 24px;"></div>
      </div>
    `;
    container.innerHTML = html;

    // Boot roofline animations
    const cleanups = [];
    container.querySelectorAll('.scene-card').forEach(card => {
      const canvas = card.querySelector('.pattern-preview-canvas');
      const scene = scenes.find(s => s.id === parseInt(card.dataset.sceneId));
      if (canvas && scene) cleanups.push(startRooflinePreview(canvas, scene));
    });
    stopPreviews = () => cleanups.forEach(fn => fn());

    container.querySelector('#back-btn')?.addEventListener('click', () => {
      stopPreviews();
      view = 'categories';
      activeCategoryId = null;
      render();
    });

    container.querySelector('#add-scene-btn')?.addEventListener('click', () => {
      stopPreviews();
      state.editingScene = null;
      navigate('patternEditor');
    });

    container.querySelectorAll('.apply-scene-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        stopPreviews();
        const scene = scenes.find(s => s.id === parseInt(btn.dataset.id));
        if (scene) {
          state.activeScene = scene.name;
          state.lightsOn = true;
          showToast(`Applied: ${scene.name}`);
          setTimeout(() => navigate('home'), 300);
        }
      });
    });

    container.querySelectorAll('.edit-scene-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        stopPreviews();
        const scene = scenes.find(s => s.id === parseInt(btn.dataset.id));
        if (scene) {
          state.editingScene = scene;
          navigate('patternEditor');
        }
      });
    });

    container.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scene = scenes.find(s => s.id === parseInt(btn.dataset.fav));
        if (scene) {
          scene.favorite = !scene.favorite;
          btn.textContent = scene.favorite ? '★' : '☆';
          btn.style.opacity = scene.favorite ? 1 : 0.3;
        }
      });
    });
  }

  render();
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
