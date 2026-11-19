/**
 * GOSH MEMORIES MODULE (PHASE 9)
 * Shared photo albums, milestone timeline, tags, favorites, and MEGA-backed memories.
 */

import { Icons } from '../../components/icons.js';
import { DB } from '../../services/db.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const MemoriesModule = {
  activeTab: 'timeline', // 'timeline', 'albums', 'favorites'
  searchQuery: '',
  unsubscribeMemories: null,
  unsubscribeAlbums: null,

  async render() {
    const memories = await DB.query('memories', null, (a, b) => new Date(b.memory_date) - new Date(a.memory_date)).catch(() => []);
    const albums = await DB.query('memory_albums', null, (a, b) => new Date(b.created_at) - new Date(a.created_at)).catch(() => []);
    const files = await DB.query('files').catch(() => []);

    // Filter memories based on active tab and search query
    let filteredMemories = memories;
    if (this.activeTab === 'favorites') {
      filteredMemories = filteredMemories.filter(m => m.is_favorite);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filteredMemories = filteredMemories.filter(m => 
        (m.caption && m.caption.toLowerCase().includes(q)) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Map memories to file metadata if available
    const enrichedMemories = filteredMemories.map(m => {
      const file = files.find(f => f.id === m.file_id);
      return {
        ...m,
        fileName: file ? file.name : 'Photo',
        thumbnailUrl: m.thumbnail_url || (file ? file.thumbnail_url : null) || ''
      };
    });

    return `
      <div class="view-container">
        <!-- Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">
              Shared Timeline & Albums
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Memories</h1>
            <p class="text-muted">A private visual timeline of our shared moments, trips, and milestones.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" id="new-album-btn">
              <span>+ New Album</span>
            </button>
            <button class="btn btn-primary" id="new-memory-btn">
              ${Icons.memories}
              <span>+ Add Memory</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="card flex justify-between items-center gap-3" style="margin-bottom: var(--space-6); padding: var(--space-3) var(--space-4);">
          <!-- Tabs -->
          <div class="flex gap-2">
            <button class="btn btn-sm ${this.activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'} mem-tab-btn" data-tab="timeline">
              Milestone Timeline (${memories.length})
            </button>
            <button class="btn btn-sm ${this.activeTab === 'albums' ? 'btn-primary' : 'btn-secondary'} mem-tab-btn" data-tab="albums">
              Albums (${albums.length})
            </button>
            <button class="btn btn-sm ${this.activeTab === 'favorites' ? 'btn-primary' : 'btn-secondary'} mem-tab-btn" data-tab="favorites">
              ★ Favorites (${memories.filter(m => m.is_favorite).length})
            </button>
          </div>

          <!-- Search Input -->
          <div style="max-width: 280px; width: 100%;">
            <input type="text" id="memory-search-input" class="input-field" placeholder="Search caption or #tag..." value="${this.searchQuery}" style="padding: 6px 12px; font-size: var(--text-xs);" />
          </div>
        </div>

        <!-- Tab Contents -->
        ${this.activeTab === 'albums' ? this.renderAlbumsTab(albums, memories) : this.renderTimelineTab(enrichedMemories)}
      </div>
    `;
  },

  renderTimelineTab(memories) {
    if (memories.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.memories}</div>
            <h3 class="card-title">No Memories Found</h3>
            <p class="text-muted" style="max-width: 400px; margin-top: 6px;">
              ${this.searchQuery ? 'No moments match your search query.' : 'Capture photos and milestones in your shared private timeline.'}
            </p>
          </div>
        </div>
      `;
    }

    // Group memories by Month and Year
    const groups = {};
    memories.forEach(m => {
      const date = new Date(m.memory_date);
      const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    return Object.entries(groups).map(([monthYear, items]) => `
      <div style="margin-bottom: var(--space-6);">
        <div class="flex items-center gap-3" style="margin-bottom: var(--space-4);">
          <span class="badge badge-violet text-xs font-semibold" style="letter-spacing: 0.05em; text-transform: uppercase;">
            ${monthYear}
          </span>
          <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
          <span class="text-xs text-muted">${items.length} ${items.length === 1 ? 'memory' : 'memories'}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4);">
          ${items.map(item => `
            <div class="card memory-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; transition: transform var(--transition-fast);">
              <!-- Photo / Media Canvas -->
              <div style="aspect-ratio: 4/3; background: #121319; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${item.thumbnailUrl ? `
                  <img src="${item.thumbnailUrl}" alt="${item.caption || 'Memory'}" style="width: 100%; height: 100%; object-fit: cover;" />
                ` : `
                  <div class="text-center" style="color: var(--text-subtle);">
                    ${Icons.memories}
                    <div style="font-size: 11px; margin-top: 4px;">Photo Attachment</div>
                  </div>
                `}
                <button class="btn btn-icon toggle-fav-btn" data-id="${item.id}" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: var(--radius-full); width: 32px; height: 32px; color: ${item.is_favorite ? 'var(--accent-primary)' : '#ffffff'};">
                  ★
                </button>
              </div>

              <!-- Content Body -->
              <div style="padding: var(--space-4); flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
                    <span class="text-xs text-muted font-mono">${new Date(item.memory_date).toLocaleDateString()}</span>
                  </div>
                  <p class="text-sm font-semibold" style="margin-bottom: var(--space-2); color: var(--text-primary); line-height: 1.4;">
                    ${item.caption || 'Untitled Moment'}
                  </p>
                  ${item.tags && item.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-1" style="margin-bottom: var(--space-2);">
                      ${item.tags.map(t => `<span class="badge badge-champagne text-xs" style="padding: 2px 6px;">#${t}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
                <div class="flex justify-between items-center" style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-2); margin-top: var(--space-2);">
                  <span class="text-xs text-muted">Added by ${item.created_by === 'u1-auth-0000-0000-000000000001' ? 'Alex' : 'Sam'}</span>
                  <button class="btn btn-sm btn-icon delete-memory-btn" data-id="${item.id}" title="Delete Memory" style="color: var(--color-danger); opacity: 0.7;">
                    ${Icons.close}
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  renderAlbumsTab(albums, memories) {
    if (albums.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.memories}</div>
            <h3 class="card-title">No Albums Created</h3>
            <p class="text-muted" style="max-width: 400px; margin-top: 6px;">
              Create curated albums for vacations, special events, and milestones.
            </p>
          </div>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4);">
        ${albums.map(album => {
          const count = memories.filter(m => m.album_id === album.id).length;
          return `
            <div class="card" style="padding: var(--space-4); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
                  <div class="brand-emblem" style="width: 40px; height: 40px; font-size: 1.2rem;">
                    ${Icons.memories}
                  </div>
                  <span class="badge badge-violet text-xs">${count} ${count === 1 ? 'item' : 'items'}</span>
                </div>
                <h3 class="card-title" style="font-size: var(--text-md); margin-bottom: var(--space-1);">${album.title}</h3>
                <p class="text-xs text-muted" style="line-height: 1.4;">${album.description || 'Shared collection'}</p>
              </div>
              <div class="flex justify-between items-center" style="margin-top: var(--space-4); pt-2; border-top: 1px solid var(--border-subtle);">
                <span class="text-xs text-muted">Created ${new Date(album.created_at).toLocaleDateString()}</span>
                <button class="btn btn-secondary btn-sm delete-album-btn" data-id="${album.id}">Delete</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  mount() {
    // Tab switching
    document.querySelectorAll('.mem-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeTab = e.currentTarget.dataset.tab;
        this.refreshView();
      });
    });

    // Search input
    const searchInput = document.getElementById('memory-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.refreshView();
      });
    }

    // Toggle favorite
    document.querySelectorAll('.toggle-fav-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const memory = await DB.getById('memories', id);
        if (memory) {
          await DB.update('memories', id, { is_favorite: !memory.is_favorite });
          Toast.success(memory.is_favorite ? 'Removed from Favorites' : 'Added to Favorites');
          this.refreshView();
        }
      });
    });

    // Delete memory
    document.querySelectorAll('.delete-memory-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm(
          'Delete Memory',
          'Are you sure you want to delete this memory? This action cannot be undone.',
          async () => {
            await DB.delete('memories', id);
            Toast.info('Memory Deleted', 'The memory was removed from the shared timeline.');
            this.refreshView();
          }
        );
      });
    });

    // Delete album
    document.querySelectorAll('.delete-album-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm(
          'Delete Album',
          'Are you sure you want to delete this album? Memories inside will remain in the timeline.',
          async () => {
            await DB.delete('memory_albums', id);
            Toast.info('Album Deleted', 'The album was removed.');
            this.refreshView();
          }
        );
      });
    });

    // New Memory Modal
    const newMemoryBtn = document.getElementById('new-memory-btn');
    if (newMemoryBtn) {
      newMemoryBtn.addEventListener('click', async () => {
        const albums = await DB.query('memory_albums').catch(() => []);
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Caption / Description</label>
              <input type="text" id="new-mem-caption" class="input-field" placeholder="e.g. Sunset at the coast road..." />
            </div>
            <div class="flex gap-3">
              <div style="flex: 1;">
                <label class="form-label">Memory Date</label>
                <input type="date" id="new-mem-date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div style="flex: 1;">
                <label class="form-label">Album (Optional)</label>
                <select id="new-mem-album" class="input-field">
                  <option value="">None (Timeline only)</option>
                  ${albums.map(a => `<option value="${a.id}">${a.title}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Tags (comma separated)</label>
              <input type="text" id="new-mem-tags" class="input-field" placeholder="vacation, beach, 2026" />
            </div>
            <div>
              <label class="form-label">Photo Thumbnail URL / Data URI</label>
              <input type="text" id="new-mem-url" class="input-field" placeholder="https://... or data:image/..." />
            </div>
            <div class="flex justify-end gap-2" style="margin-top: var(--space-2);">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-new-memory-btn">Save Memory</button>
            </div>
          </div>
        `;

        Modal.show('Add Shared Memory', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-new-memory-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const caption = document.getElementById('new-mem-caption').value.trim();
              const dateVal = document.getElementById('new-mem-date').value;
              const albumVal = document.getElementById('new-mem-album').value;
              const tagsVal = document.getElementById('new-mem-tags').value;
              const urlVal = document.getElementById('new-mem-url').value.trim();

              const tags = tagsVal ? tagsVal.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean) : [];
              const currentUser = Auth.getCurrentUser();

              await DB.insert('memories', {
                file_id: 'f-mem-' + Date.now(),
                album_id: albumVal || null,
                caption: caption || 'Shared Memory',
                memory_date: dateVal || new Date().toISOString().split('T')[0],
                tags,
                thumbnail_url: urlVal || null,
                is_favorite: false,
                created_by: currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001'
              });

              Modal.close();
              Toast.success('Memory Added', 'Added to our shared private timeline.');
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // New Album Modal
    const newAlbumBtn = document.getElementById('new-album-btn');
    if (newAlbumBtn) {
      newAlbumBtn.addEventListener('click', () => {
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Album Title</label>
              <input type="text" id="new-album-title" class="input-field" placeholder="e.g. Summer Road Trip 2026" />
            </div>
            <div>
              <label class="form-label">Description</label>
              <textarea id="new-album-desc" class="input-field" rows="3" placeholder="Brief summary of this album collection..."></textarea>
            </div>
            <div class="flex justify-end gap-2" style="margin-top: var(--space-2);">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-new-album-btn">Create Album</button>
            </div>
          </div>
        `;

        Modal.show('Create Photo Album', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-new-album-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const title = document.getElementById('new-album-title').value.trim();
              const desc = document.getElementById('new-album-desc').value.trim();

              if (!title) {
                Toast.error('Title Required', 'Please enter a title for the album.');
                return;
              }

              const currentUser = Auth.getCurrentUser();
              await DB.insert('memory_albums', {
                title,
                description: desc || '',
                created_by: currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001'
              });

              Modal.close();
              Toast.success('Album Created', `"${title}" is ready for photos.`);
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // Subscribe to DB updates
    if (!this.unsubscribeMemories) {
      this.unsubscribeMemories = DB.subscribe('memories', () => this.refreshView());
    }
  },

  async refreshView() {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (main && window.location.hash === '#memories') {
      main.innerHTML = await this.render();
      this.mount();
    }
  },

  unmount() {
    if (this.unsubscribeMemories) {
      this.unsubscribeMemories();
      this.unsubscribeMemories = null;
    }
    if (this.unsubscribeAlbums) {
      this.unsubscribeAlbums();
      this.unsubscribeAlbums = null;
    }
  }
};
