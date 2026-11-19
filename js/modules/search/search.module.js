/**
 * GOSH SMART SEARCH MODULE (PHASE 9)
 * Unified Instant Search across Messages, Files, Documents, Memories, Diary, Events, and Tasks.
 */

import { Icons } from '../../components/icons.js';
import { DB } from '../../services/db.service.js';
import { Crypto } from '../../services/crypto.service.js';
import { Vault } from '../../services/vault.service.js';
import { Toast } from '../../components/toast.js';

export const SearchModule = {
  searchQuery: '',
  activeCategory: 'all', // 'all', 'messages', 'files', 'documents', 'memories', 'diary', 'together', 'vault'

  async executeSearch(query) {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();
    const results = [];

    // 1. Search Messages
    try {
      const messages = await DB.query('messages').catch(() => []);
      for (const msg of messages) {
        let content = '';
        try {
          content = await Crypto.decrypt(msg.content_encrypted, msg.iv);
        } catch {}
        if (content && content.toLowerCase().includes(q)) {
          results.push({
            category: 'messages',
            categoryLabel: 'Connect Message',
            title: content.length > 50 ? content.substring(0, 50) + '...' : content,
            snippet: `Sent on ${new Date(msg.created_at).toLocaleDateString()}`,
            link: '#connect',
            icon: Icons.connect
          });
        }
      }
    } catch {}

    // 2. Search Files (Cloud)
    try {
      const files = await DB.query('files').catch(() => []);
      for (const file of files) {
        if (file.name.toLowerCase().includes(q) || (file.category && file.category.toLowerCase().includes(q))) {
          results.push({
            category: 'files',
            categoryLabel: 'Cloud File',
            title: file.name,
            snippet: `${(file.file_size / (1024 * 1024)).toFixed(1)} MB • Uploaded ${new Date(file.created_at).toLocaleDateString()}`,
            link: '#cloud',
            icon: Icons.cloud
          });
        }
      }
    } catch {}

    // 3. Search Documents (Locker)
    try {
      const docs = await DB.query('documents').catch(() => []);
      for (const doc of docs) {
        if (doc.title.toLowerCase().includes(q) || (doc.notes && doc.notes.toLowerCase().includes(q))) {
          results.push({
            category: 'documents',
            categoryLabel: 'Document Locker',
            title: doc.title,
            snippet: `Category: ${doc.category} • ${doc.notes || 'Confidential document'}`,
            link: '#documents',
            icon: Icons.documents
          });
        }
      }
    } catch {}

    // 4. Search Memories
    try {
      const memories = await DB.query('memories').catch(() => []);
      for (const mem of memories) {
        const matchesCaption = mem.caption && mem.caption.toLowerCase().includes(q);
        const matchesTag = mem.tags && mem.tags.some(t => t.toLowerCase().includes(q));
        if (matchesCaption || matchesTag) {
          results.push({
            category: 'memories',
            categoryLabel: 'Memory Milestone',
            title: mem.caption || 'Untitled Memory',
            snippet: `Date: ${new Date(mem.memory_date).toLocaleDateString()} ${mem.tags ? '• #' + mem.tags.join(' #') : ''}`,
            link: '#memories',
            icon: Icons.memories
          });
        }
      }
    } catch {}

    // 5. Search Diary
    try {
      const entries = await DB.query('diary_entries').catch(() => []);
      for (const entry of entries) {
        let title = '';
        let content = '';
        try {
          const [titleIv, contentIv] = (entry.iv && entry.iv.includes(':')) ? entry.iv.split(':') : [entry.iv, entry.iv];
          title = await Crypto.decrypt(entry.title_encrypted, titleIv);
          content = await Crypto.decrypt(entry.content_encrypted, contentIv);
        } catch {}

        if ((title && title.toLowerCase().includes(q)) || (content && content.toLowerCase().includes(q))) {
          results.push({
            category: 'diary',
            categoryLabel: 'Diary Journal',
            title: title || 'Journal Entry',
            snippet: `${new Date(entry.entry_date).toLocaleDateString()} • Mood: ${entry.mood}`,
            link: '#diary',
            icon: Icons.diary
          });
        }
      }
    } catch {}

    // 6. Search Together (Calendar Events & Tasks)
    try {
      const events = await DB.query('calendar_events').catch(() => []);
      for (const ev of events) {
        if (ev.title.toLowerCase().includes(q) || (ev.description && ev.description.toLowerCase().includes(q))) {
          results.push({
            category: 'together',
            categoryLabel: 'Calendar Event',
            title: ev.title,
            snippet: `${new Date(ev.start_time).toLocaleDateString()} • ${ev.category}`,
            link: '#together',
            icon: Icons.together
          });
        }
      }

      const tasks = await DB.query('shared_tasks').catch(() => []);
      for (const t of tasks) {
        if (t.title.toLowerCase().includes(q)) {
          results.push({
            category: 'together',
            categoryLabel: 'Shared Task',
            title: t.title,
            snippet: `Priority: ${t.priority} • Status: ${t.completed ? 'Completed' : 'Pending'}`,
            link: '#together',
            icon: Icons.together
          });
        }
      }

      const expenses = await DB.query('shared_expenses').catch(() => []);
      for (const exp of expenses) {
        if (exp.title.toLowerCase().includes(q) || (exp.category && exp.category.toLowerCase().includes(q))) {
          results.push({
            category: 'together',
            categoryLabel: 'Shared Expense',
            title: exp.title,
            snippet: `$${parseFloat(exp.amount).toFixed(2)} • ${exp.category} • ${new Date(exp.expense_date).toLocaleDateString()}`,
            link: '#together',
            icon: Icons.together
          });
        }
      }
    } catch {}

    // 7. Search Vault
    try {
      const vaultItems = await DB.query('vault_items').catch(() => []);
      for (const vi of vaultItems) {
        if (vi.title.toLowerCase().includes(q) || vi.category.toLowerCase().includes(q)) {
          results.push({
            category: 'vault',
            categoryLabel: 'Password Vault',
            title: vi.title,
            snippet: `Category: ${vi.category} • Zero-Knowledge Encrypted`,
            link: '#vault',
            icon: Icons.vault
          });
        }
      }
    } catch {}

    return results;
  },

  async render() {
    const rawResults = await this.executeSearch(this.searchQuery);
    const results = this.activeCategory === 'all' ? 
      rawResults : 
      rawResults.filter(r => r.category === this.activeCategory);

    return `
      <div class="view-container">
        <!-- Top Search Bar Header -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card-header" style="margin-bottom: var(--space-3);">
            <div>
              <div class="badge badge-violet" style="margin-bottom: var(--space-2);">
                Multi-Module Search Engine
              </div>
              <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Smart Search</h1>
              <p class="text-muted">Instant unified search across all 15 private platform modules.</p>
            </div>
          </div>

          <!-- Input Bar -->
          <div class="flex gap-3">
            <input 
              type="text" 
              id="global-search-input" 
              class="input-field" 
              placeholder="Search messages, documents, files, memories, diary, tasks..." 
              value="${this.escapeHtml(this.searchQuery)}" 
              style="flex: 1; font-size: var(--text-md);" 
              autofocus 
            />
            <button class="btn btn-primary" id="trigger-search-btn">
              ${Icons.search}
              <span>Search</span>
            </button>
          </div>
        </div>

        <!-- Category Pills Ribbon -->
        <div class="card flex flex-wrap gap-2 items-center" style="margin-bottom: var(--space-6); padding: var(--space-3) var(--space-4);">
          <button class="btn btn-sm ${this.activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="all">
            All (${rawResults.length})
          </button>
          <button class="btn btn-sm ${this.activeCategory === 'messages' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="messages">
            Messages (${rawResults.filter(r => r.category === 'messages').length})
          </button>
          <button class="btn btn-sm ${this.activeCategory === 'files' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="files">
            Files (${rawResults.filter(r => r.category === 'files').length})
          </button>
          <button class="btn btn-sm ${this.activeCategory === 'documents' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="documents">
            Documents (${rawResults.filter(r => r.category === 'documents').length})
          </button>
          <button class="btn btn-sm ${this.activeCategory === 'memories' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="memories">
            Memories (${rawResults.filter(r => r.category === 'memories').length})
          </button>
          <button class="btn btn-sm ${this.activeCategory === 'diary' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="diary">
            Diary (${rawResults.filter(r => r.category === 'diary').length})
          </button>
          <button class="btn btn-sm ${this.activeCategory === 'together' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="together">
            Together (${rawResults.filter(r => r.category === 'together').length})
          </button>
          <button class="btn btn-sm ${this.activeCategory === 'vault' ? 'btn-primary' : 'btn-secondary'} search-cat-btn" data-cat="vault">
            Vault (${rawResults.filter(r => r.category === 'vault').length})
          </button>
        </div>

        <!-- Results Feed -->
        ${!this.searchQuery.trim() ? `
          <div class="card">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons.search}</div>
              <h3 class="card-title">Search Everything in GOSH</h3>
              <p class="text-muted" style="max-width: 420px; margin-top: 6px;">
                Type keywords above to instantly locate encrypted messages, cloud files, memories, diary entries, calendar dates, and passwords.
              </p>
            </div>
          </div>
        ` : results.length === 0 ? `
          <div class="card">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons.search}</div>
              <h3 class="card-title">No Matching Results</h3>
              <p class="text-muted" style="max-width: 400px; margin-top: 6px;">
                No matches found for "${this.escapeHtml(this.searchQuery)}". Try broadening your search query.
              </p>
            </div>
          </div>
        ` : `
          <div class="flex flex-col gap-3">
            ${results.map(r => `
              <div class="card flex justify-between items-center" style="padding: 14px 20px; background: var(--bg-surface-hover); border-color: var(--border-subtle); transition: border-color var(--transition-fast);">
                <div class="flex items-center gap-3">
                  <div style="color: var(--accent-primary);">
                    ${r.icon}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="badge badge-champagne text-xs">${r.categoryLabel}</span>
                      <span class="text-sm font-semibold" style="color: var(--text-primary);">${this.escapeHtml(r.title)}</span>
                    </div>
                    <div class="text-xs text-muted" style="margin-top: 2px;">${r.snippet}</div>
                  </div>
                </div>

                <a href="${r.link}" class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 11px;">
                  Jump ↗
                </a>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  mount() {
    // Search input typing
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.refreshView();
        }
      });
    }

    // Search button
    const searchBtn = document.getElementById('trigger-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.refreshView());
    }

    // Category Buttons
    document.querySelectorAll('.search-cat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeCategory = e.currentTarget.dataset.cat;
        this.refreshView();
      });
    });
  },

  async refreshView() {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (main && window.location.hash === '#search') {
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
  }
};
