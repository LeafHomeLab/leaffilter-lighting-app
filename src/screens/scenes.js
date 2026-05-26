import { scenes, sceneCategories } from '../data/scenes.js';

export function renderScenes(container, state, navigate) {
  let activeCategory = 'All';

  function render() {
    const filtered = activeCategory === 'All' ? scenes
      : activeCategory === 'Favorites' ? scenes.filter(s => s.favorite)
      : scenes.filter(s => s.category === activeCategory);

    const html = `
      <div class="screen" id="screen-scenes">
        <div class="screen-header">
          <h1 class="screen-title">Scenes</h1>
          <button class="btn-icon" id="add-scene-btn" title="Create custom scene">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <!-- Search -->
        <div class="scene-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search scenes..." id="scene-search-input" />
        </div>

        <!-- Category Tabs -->
        <div class="category-tabs" id="category-tabs">
          ${sceneCategories.map(cat => `
            <button class="category-tab ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>
          `).join('')}
        </div>

        <!-- Scene Grid -->
        <div class="scenes-grid stagger" id="scenes-grid">
          ${filtered.map(scene => `
            <div class="scene-card" data-scene-id="${scene.id}">
              <div class="scene-card-preview animated-gradient">
                ${scene.colors.map(c => `<div style="background:${c}"></div>`).join('')}
              </div>
              <div class="scene-card-body">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div class="scene-card-name">${scene.name}</div>
                  <button class="fav-btn" data-fav="${scene.id}" style="font-size:16px; opacity:${scene.favorite ? 1 : 0.3}; padding:0;">
                    ${scene.favorite ? '★' : '☆'}
                  </button>
                </div>
                <div class="scene-card-meta">
                  <span>${scene.animation}</span>
                  ${scene.speed > 0 ? `<span>· Speed ${scene.speed}</span>` : ''}
                </div>
                <div class="scene-card-actions">
                  <button class="btn btn-primary btn-sm apply-scene-btn" data-id="${scene.id}" style="flex:1;">Apply</button>
                  <button class="btn btn-secondary btn-sm" style="flex:1;">Edit</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        ${filtered.length === 0 ? `
          <div style="text-align:center; padding: 48px 16px; color: var(--text-secondary);">
            <div style="font-size: 40px; margin-bottom: 12px;">🎨</div>
            <div style="font-weight: var(--fw-semibold); margin-bottom: 4px;">No scenes here yet</div>
            <div style="font-size: var(--fs-small);">Create your first custom scene</div>
          </div>
        ` : ''}

        <div style="height: 24px;"></div>
      </div>
    `;
    container.innerHTML = html;

    // Category tab clicks
    container.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeCategory = tab.dataset.cat;
        render();
      });
    });

    // Apply scene
    container.querySelectorAll('.apply-scene-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scene = scenes.find(s => s.id === parseInt(btn.dataset.id));
        if (scene) {
          state.activeScene = scene.name;
          state.lightsOn = true;
          showToast(`Applied: ${scene.name}`);
        }
      });
    });

    // Favorite toggle
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

    // Search
    const searchInput = container.querySelector('#scene-search-input');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.scene-card').forEach(card => {
        const name = card.querySelector('.scene-card-name').textContent.toLowerCase();
        card.style.display = name.includes(q) ? '' : 'none';
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
