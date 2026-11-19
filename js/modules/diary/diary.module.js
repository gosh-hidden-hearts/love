/**
 * GOSH DIARY MODULE (PHASE 9)
 * Shared private journal with Web Crypto AES-256-GCM encryption, mood tags, and date navigation.
 */

import { Icons } from '../../components/icons.js';
import { DB } from '../../services/db.service.js';
import { Auth } from '../../services/auth.service.js';
import { Crypto } from '../../services/crypto.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const DiaryModule = {
  searchQuery: '',
  selectedMood: 'all',
  unsubscribeDiary: null,

  moods: [
    { id: 'peaceful', label: '🌿 Peaceful', color: '#10b981' },
    { id: 'joyful', label: '✨ Joyful', color: '#f59e0b' },
    { id: 'reflective', label: '💭 Reflective', color: '#8b5cf6' },
    { id: 'motivated', label: '🔥 Motivated', color: '#ec4899' },
    { id: 'calm', label: '🌙 Calm', color: '#38bdf8' },
    { id: 'somber', label: '🌧️ Somber', color: '#64748b' }
  ],

  async render() {
    const rawEntries = await DB.query('diary_entries', null, (a, b) => new Date(b.entry_date) - new Date(a.entry_date)).catch(() => []);

    // Decrypt entries in memory
    const decryptedEntries = await Promise.all(rawEntries.map(async (entry) => {
      let title = '[Encrypted Title]';
      let content = '[Encrypted Body]';
      try {
        const [titleIv, contentIv] = (entry.iv && entry.iv.includes(':')) ? entry.iv.split(':') : [entry.iv, entry.iv];
        title = await Crypto.decrypt(entry.title_encrypted, titleIv);
        content = await Crypto.decrypt(entry.content_encrypted, contentIv);
      } catch (err) {
        console.warn('Failed to decrypt diary entry:', entry.id);
      }
      return {
        ...entry,
        decryptedTitle: title,
        decryptedContent: content
      };
    }));

    // Filter by mood and search query
    let filtered = decryptedEntries;
    if (this.selectedMood !== 'all') {
      filtered = filtered.filter(e => e.mood === this.selectedMood);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.decryptedTitle.toLowerCase().includes(q) ||
        e.decryptedContent.toLowerCase().includes(q)
      );
    }

    return `
      <div class="view-container">
        <!-- Top Action & Title Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-violet" style="margin-bottom: var(--space-2);">
              E2E Encrypted Journal
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Shared Diary</h1>
            <p class="text-muted">A private encrypted space for our reflections, thoughts, and memories.</p>
          </div>
          <button class="btn btn-primary" id="new-diary-entry-btn">
            ${Icons.diary}
            <span>+ New Entry</span>
          </button>
        </div>

        <!-- Filter & Mood Ribbon -->
        <div class="card flex flex-col md:flex-row justify-between items-center gap-3" style="margin-bottom: var(--space-6); padding: var(--space-3) var(--space-4);">
          <!-- Mood Pills -->
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-xs text-muted" style="margin-right: 4px;">Mood:</span>
            <button class="btn btn-sm ${this.selectedMood === 'all' ? 'btn-primary' : 'btn-secondary'} mood-filter-btn" data-mood="all">
              All (${decryptedEntries.length})
            </button>
            ${this.moods.map(m => `
              <button class="btn btn-sm ${this.selectedMood === m.id ? 'btn-primary' : 'btn-secondary'} mood-filter-btn" data-mood="${m.id}">
                ${m.label}
              </button>
            `).join('')}
          </div>

          <!-- Search Input -->
          <div style="max-width: 260px; width: 100%;">
            <input type="text" id="diary-search-input" class="input-field" placeholder="Search entries..." value="${this.searchQuery}" style="padding: 6px 12px; font-size: var(--text-xs);" />
          </div>
        </div>

        <!-- Entries Feed -->
        ${filtered.length === 0 ? `
          <div class="card">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons.diary}</div>
              <h3 class="card-title">No Journal Entries Found</h3>
              <p class="text-muted" style="max-width: 400px; margin-top: 6px;">
                ${this.searchQuery || this.selectedMood !== 'all' ? 'No entries match your current filters.' : 'Write your first encrypted thought together.'}
              </p>
            </div>
          </div>
        ` : `
          <div class="flex flex-col gap-4">
            ${filtered.map(entry => {
              const moodMeta = this.moods.find(m => m.id === entry.mood) || { label: '🌿 Peaceful', color: '#10b981' };
              const authorName = entry.created_by === 'u1-auth-0000-0000-000000000001' ? 'Alex' : 'Sam';

              return `
                <div class="card" style="padding: var(--space-5); border-left: 4px solid ${moodMeta.color};">
                  <div class="flex justify-between items-start" style="margin-bottom: var(--space-2);">
                    <div class="flex items-center gap-3">
                      <span class="badge" style="background: rgba(255,255,255,0.06); color: ${moodMeta.color}; border: 1px solid ${moodMeta.color}33;">
                        ${moodMeta.label}
                      </span>
                      <h2 style="font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); margin: 0;">
                        ${this.escapeHtml(entry.decryptedTitle)}
                      </h2>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-xs text-muted font-mono">${new Date(entry.entry_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      <button class="btn btn-sm btn-icon delete-diary-btn" data-id="${entry.id}" title="Delete Entry" style="color: var(--color-danger); opacity: 0.7;">
                        ${Icons.close}
                      </button>
                    </div>
                  </div>

                  <!-- Entry Content -->
                  <div style="font-size: var(--text-sm); line-height: 1.7; color: var(--text-secondary); margin: var(--space-3) 0; white-space: pre-wrap;">
                    ${this.escapeHtml(entry.decryptedContent)}
                  </div>

                  <div class="flex justify-between items-center" style="margin-top: var(--space-4); pt-2; border-top: 1px solid var(--border-subtle);">
                    <span class="text-xs text-muted">
                      Written by <strong style="color: var(--text-primary);">${authorName}</strong> • ${new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span class="badge badge-champagne text-xs">AES-256-GCM Secured</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  mount() {
    // Mood Filter Buttons
    document.querySelectorAll('.mood-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedMood = e.currentTarget.dataset.mood;
        this.refreshView();
      });
    });

    // Search Input
    const searchInput = document.getElementById('diary-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.refreshView();
      });
    }

    // Delete Entry
    document.querySelectorAll('.delete-diary-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        Modal.confirm(
          'Delete Journal Entry',
          'Are you sure you want to permanently delete this diary entry? It will be removed from all devices.',
          async () => {
            await DB.delete('diary_entries', id);
            Toast.info('Entry Removed', 'The journal entry was permanently deleted.');
            this.refreshView();
          }
        );
      });
    });

    // New Entry Modal
    const newEntryBtn = document.getElementById('new-diary-entry-btn');
    if (newEntryBtn) {
      newEntryBtn.addEventListener('click', () => {
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Entry Title</label>
              <input type="text" id="diary-entry-title" class="input-field" placeholder="e.g. Quiet afternoon reflections..." />
            </div>
            <div class="flex gap-3">
              <div style="flex: 1;">
                <label class="form-label">Date</label>
                <input type="date" id="diary-entry-date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div style="flex: 1;">
                <label class="form-label">Mood</label>
                <select id="diary-entry-mood" class="input-field">
                  ${this.moods.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Journal Thoughts (Encrypted before storage)</label>
              <textarea id="diary-entry-body" class="input-field" rows="6" placeholder="Write your thoughts freely. Content is encrypted client-side using Web Crypto AES-256-GCM..."></textarea>
            </div>
            <div class="flex justify-end gap-2" style="margin-top: var(--space-2);">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="save-diary-entry-btn">Save Entry</button>
            </div>
          </div>
        `;

        Modal.show('Write Journal Entry', modalHtml);

        setTimeout(() => {
          const saveBtn = document.getElementById('save-diary-entry-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              const title = document.getElementById('diary-entry-title').value.trim();
              const dateVal = document.getElementById('diary-entry-date').value;
              const moodVal = document.getElementById('diary-entry-mood').value;
              const body = document.getElementById('diary-entry-body').value.trim();

              if (!title || !body) {
                Toast.error('Incomplete Entry', 'Please provide both a title and journal text.');
                return;
              }

              // Encrypt title and body using Web Crypto AES-256-GCM
              const encTitle = await Crypto.encrypt(title);
              const encBody = await Crypto.encrypt(body);
              const currentUser = Auth.getCurrentUser();

              await DB.insert('diary_entries', {
                entry_date: dateVal || new Date().toISOString().split('T')[0],
                mood: moodVal || 'peaceful',
                title_encrypted: encTitle.ciphertext,
                content_encrypted: encBody.ciphertext,
                iv: `${encTitle.iv}:${encBody.iv}`, // store both IVs
                created_by: currentUser ? currentUser.id : 'u1-auth-0000-0000-000000000001'
              });

              Modal.close();
              Toast.success('Entry Saved', 'Encrypted and synced to our shared journal.');
              this.refreshView();
            });
          }
        }, 50);
      });
    }

    // Subscribe to DB updates
    if (!this.unsubscribeDiary) {
      this.unsubscribeDiary = DB.subscribe('diary_entries', () => this.refreshView());
    }
  },

  async refreshView() {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (main && window.location.hash === '#diary') {
      main.innerHTML = await this.render();
      this.mount();
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  unmount() {
    if (this.unsubscribeDiary) {
      this.unsubscribeDiary();
      this.unsubscribeDiary = null;
    }
  }
};
