/**
 * GOSH VAULT MODULE (PHASE 7)
 * Zero-Knowledge Password Manager, AES-256-GCM Vault, Generator & Strength Meter.
 */

import { Icons } from '../../components/icons.js';
import { Vault } from '../../services/vault.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const VaultModule = {
  activeCategory: 'all', // 'all', 'login', 'card', 'note', 'identity'
  searchQuery: '',
  revealedPasswords: new Set(),

  async render() {
    // 1. Check if Vault is Locked
    if (!Vault.isUnlocked) {
      return this.renderLockedState();
    }

    // 2. Fetch Decrypted Vault Items
    let items = await Vault.getDecryptedItems();

    // 3. Category Filter
    if (this.activeCategory !== 'all') {
      items = items.filter(i => i.category === this.activeCategory);
    }

    // 4. Search Filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) || 
        (i.username && i.username.toLowerCase().includes(q)) ||
        (i.url && i.url.toLowerCase().includes(q))
      );
    }

    return `
      <div class="view-container">
        <!-- Top Vault Header & Action Bar -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">
              AES-256-GCM Zero-Knowledge Active
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Vault</h1>
            <p class="text-muted">Encrypted passwords, credentials, credit cards, and secure notes.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" id="generator-modal-btn">
              ${Icons.unlock}
              <span>Generator</span>
            </button>
            <button class="btn btn-accent" id="lock-vault-now-btn">
              ${Icons.lock}
              <span>Lock Vault</span>
            </button>
            <button class="btn btn-primary" id="add-vault-item-btn">
              <span>+ Add Item</span>
            </button>
          </div>
        </div>

        <!-- Filter, Category & Search Controls -->
        <div class="card" style="margin-bottom: var(--space-5); padding: 12px 18px;">
          <div class="flex justify-between items-center flex-wrap gap-3">
            <!-- Category Chips -->
            <div class="flex gap-1">
              <button class="btn btn-sm vault-category-chip ${this.activeCategory === 'all' ? 'btn-primary' : 'btn-ghost'}" data-category="all">All (${items.length})</button>
              <button class="btn btn-sm vault-category-chip ${this.activeCategory === 'login' ? 'btn-primary' : 'btn-ghost'}" data-category="login">Logins</button>
              <button class="btn btn-sm vault-category-chip ${this.activeCategory === 'card' ? 'btn-primary' : 'btn-ghost'}" data-category="card">Cards</button>
              <button class="btn btn-sm vault-category-chip ${this.activeCategory === 'note' ? 'btn-primary' : 'btn-ghost'}" data-category="note">Secure Notes</button>
              <button class="btn btn-sm vault-category-chip ${this.activeCategory === 'identity' ? 'btn-primary' : 'btn-ghost'}" data-category="identity">Identities</button>
            </div>

            <!-- Search Field -->
            <input 
              type="text" 
              id="vault-search-input" 
              class="input-field" 
              placeholder="Search vault..." 
              value="${this.searchQuery}" 
              style="max-width: 220px; padding: 6px 12px; font-size: var(--text-xs);" 
            />
          </div>
        </div>

        <!-- Vault Items Grid -->
        ${items.length === 0 ? `
          <div class="card empty-state" style="padding: 56px var(--space-4);">
            <div class="empty-state-icon" style="color: var(--accent-secondary);">${Icons.vault}</div>
            <h4 class="card-title text-sm">No Vault Items Found</h4>
            <p class="text-xs text-muted" style="margin-top: 4px;">Click "+ Add Item" to store an encrypted login, credit card, or private note.</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4);">
            ${items.map(item => this.renderVaultCard(item)).join('')}
          </div>
        `}
      </div>
    `;
  },

  renderLockedState() {
    return `
      <div style="min-height: calc(100vh - 160px); display: flex; align-items: center; justify-content: center; padding: var(--space-4);">
        <div class="card" style="width: 100%; max-width: 440px; padding: var(--space-8); text-align: center; border-color: var(--accent-secondary-dark); box-shadow: var(--shadow-lg);">
          <div class="brand-emblem" style="width: 58px; height: 58px; margin: 0 auto var(--space-4); background: linear-gradient(135deg, var(--accent-secondary-dark), #927546); color: #ffffff;">
            ${Icons.vault}
          </div>
          <h2 class="card-title" style="font-size: var(--text-xl); color: var(--accent-secondary);">GOSH Vault Locked</h2>
          <p class="text-xs text-muted" style="margin-top: 6px; line-height: 1.6;">
            Your credentials are protected with client-side AES-256-GCM zero-knowledge encryption. Enter your master passphrase to decrypt them into memory.
          </p>

          <form id="vault-unlock-form" style="margin-top: var(--space-6);">
            <div class="form-group text-left">
              <label class="form-label" for="vault-passphrase-input">Master Passphrase</label>
              <input 
                type="password" 
                id="vault-passphrase-input" 
                class="input-field" 
                placeholder="••••••••••••" 
                required 
                autofocus 
                autocomplete="current-password"
              />
            </div>

            <div id="vault-unlock-error" class="badge badge-danger w-full text-center" style="display: none; padding: 8px; margin-bottom: var(--space-3); white-space: normal;"></div>

            <button type="submit" id="vault-unlock-submit-btn" class="btn btn-accent w-full" style="margin-top: var(--space-2);">
              <span>Unlock Vault</span>
            </button>
          </form>

          <div style="margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle);">
            <p class="text-xs text-muted">
              Auto-Lock Timer: 5 Minutes • Zero Decrypted Storage
            </p>
          </div>
        </div>
      </div>
    `;
  },

  renderVaultCard(item) {
    const isRevealed = this.revealedPasswords.has(item.id);
    const hasPassword = Boolean(item.password);

    return `
      <div class="card flex flex-col justify-between" style="background: var(--bg-surface-hover); padding: var(--space-5);">
        <div>
          <!-- Card Header -->
          <div class="flex justify-between items-start" style="margin-bottom: var(--space-3);">
            <div class="flex items-center gap-3 truncate">
              <div style="color: var(--accent-secondary); flex-shrink: 0;">${Icons.vault}</div>
              <div class="truncate">
                <div class="text-sm font-semibold truncate" style="color: var(--text-primary);">${item.title}</div>
                <span class="badge badge-champagne text-xs" style="text-transform: capitalize;">${item.category}</span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="btn btn-icon btn-ghost btn-sm edit-item-btn" data-id="${item.id}" title="Edit Item" style="width: 28px; height: 28px;">✎</button>
              <button class="btn btn-icon btn-ghost btn-sm delete-item-btn" data-id="${item.id}" title="Delete Item" style="width: 28px; height: 28px;">🗑</button>
            </div>
          </div>

          <!-- Username Row -->
          ${item.username ? `
            <div class="flex justify-between items-center" style="padding: 6px 10px; background: var(--bg-primary); border-radius: var(--radius-sm); margin-bottom: var(--space-2);">
              <span class="text-xs text-muted truncate">${item.username}</span>
              <button class="btn btn-ghost btn-sm copy-username-btn" data-username="${item.username}" title="Copy Username" style="padding: 2px 6px; font-size: 0.688rem;">Copy</button>
            </div>
          ` : ''}

          <!-- Password Row -->
          ${hasPassword ? `
            <div class="flex justify-between items-center" style="padding: 6px 10px; background: var(--bg-primary); border-radius: var(--radius-sm); margin-bottom: var(--space-2);">
              <span class="text-xs font-mono truncate" style="letter-spacing: ${isRevealed ? 'normal' : '0.15em'}; color: ${isRevealed ? 'var(--text-primary)' : 'var(--text-muted)'};">
                ${isRevealed ? item.password : '••••••••••••'}
              </span>
              <div class="flex items-center gap-1">
                <button class="btn btn-ghost btn-sm toggle-reveal-btn" data-id="${item.id}" style="padding: 2px 6px; font-size: 0.688rem;">
                  ${isRevealed ? 'Hide' : 'Show'}
                </button>
                <button class="btn btn-ghost btn-sm copy-password-btn" data-password="${item.password}" title="Copy Password" style="padding: 2px 6px; font-size: 0.688rem;">
                  Copy
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Notes Snippet -->
          ${item.notes ? `
            <p class="text-xs text-muted" style="margin-top: 6px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.notes}
            </p>
          ` : ''}
        </div>

        <!-- URL Link -->
        ${item.url ? `
          <div style="margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px solid var(--border-subtle);">
            <a href="${item.url.startsWith('http') ? item.url : 'https://' + item.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-muted flex items-center gap-1 hover-text-primary" style="text-decoration: underline;">
              Visit Website ↗
            </a>
          </div>
        ` : ''}
      </div>
    `;
  },

  mount(container) {
    // 1. Handle Unlock Form (If locked)
    const unlockForm = container.querySelector('#vault-unlock-form');
    if (unlockForm) {
      const passInput = container.querySelector('#vault-passphrase-input');
      const errorDiv = container.querySelector('#vault-unlock-error');
      const submitBtn = container.querySelector('#vault-unlock-submit-btn');

      unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Deriving AES-256-GCM Key...</span>';

        try {
          const pass = passInput.value;
          await Vault.unlockVault(pass);
          window.AppRouter?.handleRouting();
        } catch (err) {
          errorDiv.textContent = err.message || 'Unlock failed.';
          errorDiv.style.display = 'block';
          Toast.error('Vault Access Denied', err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Unlock Vault</span>';
        }
      });
      return;
    }

    // 2. Lock Vault Button
    const lockBtn = container.querySelector('#lock-vault-now-btn');
    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        Vault.lockVault();
        window.AppRouter?.handleRouting();
      });
    }

    // 3. Add Item Modal
    const addBtn = container.querySelector('#add-vault-item-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openItemEditorModal());
    }

    // 4. Password Generator Modal
    const genBtn = container.querySelector('#generator-modal-btn');
    if (genBtn) {
      genBtn.addEventListener('click', () => this.openGeneratorModal());
    }

    // 5. Category Chips & Search
    container.querySelectorAll('.vault-category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeCategory = chip.getAttribute('data-category');
        window.AppRouter?.handleRouting();
      });
    });

    const searchInput = container.querySelector('#vault-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          window.AppRouter?.handleRouting();
        }, 200);
      });
    }

    // 6. Copy Buttons & Reveal Toggles
    container.querySelectorAll('.copy-username-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Vault.copyToClipboard(btn.getAttribute('data-username'), 'Username');
      });
    });

    container.querySelectorAll('.copy-password-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Vault.copyToClipboard(btn.getAttribute('data-password'), 'Password');
      });
    });

    container.querySelectorAll('.toggle-reveal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (this.revealedPasswords.has(id)) {
          this.revealedPasswords.delete(id);
        } else {
          this.revealedPasswords.add(id);
        }
        window.AppRouter?.handleRouting();
      });
    });

    // 7. Edit & Delete Actions
    container.querySelectorAll('.edit-item-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const items = await Vault.getDecryptedItems();
        const item = items.find(i => i.id === id);
        if (item) this.openItemEditorModal(item);
      });
    });

    container.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        Modal.confirm({
          title: 'Delete Credential',
          message: 'Are you sure you want to delete this vault item? This action cannot be undone.',
          isDanger: true,
          confirmText: 'Delete',
          onConfirm: async () => {
            await Vault.deleteItem(id);
            window.AppRouter?.handleRouting();
          }
        });
      });
    });
  },

  openItemEditorModal(existing = null) {
    const isEdit = Boolean(existing);
    Modal.open({
      title: isEdit ? `Edit: ${existing.title}` : 'Add Protected Credential',
      content: `
        <form id="vault-item-form">
          <div class="form-group">
            <label class="form-label" for="item-title">Title</label>
            <input type="text" id="item-title" class="input-field" placeholder="e.g. Netflix or Banking" value="${existing?.title || ''}" required autofocus />
          </div>

          <div class="form-group">
            <label class="form-label" for="item-category">Category</label>
            <select id="item-category" class="input-field">
              <option value="login" ${existing?.category === 'login' ? 'selected' : ''}>Login</option>
              <option value="card" ${existing?.category === 'card' ? 'selected' : ''}>Card Details</option>
              <option value="note" ${existing?.category === 'note' ? 'selected' : ''}>Secure Note</option>
              <option value="identity" ${existing?.category === 'identity' ? 'selected' : ''}>Identity</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="item-username">Username / Email / Account ID</label>
            <input type="text" id="item-username" class="input-field" placeholder="name@domain.com" value="${existing?.username || ''}" />
          </div>

          <div class="form-group">
            <div class="flex justify-between items-center">
              <label class="form-label" for="item-password">Password / Secret PIN</label>
              <button type="button" id="modal-gen-pass-btn" class="text-xs text-muted" style="text-decoration: underline;">Generate</button>
            </div>
            <input type="text" id="item-password" class="input-field font-mono" placeholder="••••••••••••" value="${existing?.password || ''}" />
            <div id="modal-strength-bar" style="height: 4px; border-radius: var(--radius-full); background: var(--border-subtle); margin-top: 4px; overflow: hidden;">
              <div id="modal-strength-fill" style="width: 0%; height: 100%; transition: width 0.2s ease;"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="item-url">Website URL</label>
            <input type="url" id="item-url" class="input-field" placeholder="https://..." value="${existing?.url || ''}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="item-notes">Confidential Notes</label>
            <textarea id="item-notes" class="input-field" rows="3" placeholder="Recovery codes, security questions, notes...">${existing?.notes || ''}</textarea>
          </div>
        </form>
      `,
      footer: `
        <div class="flex gap-2">
          <button class="btn btn-secondary" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Cancel</button>
          <button class="btn btn-primary" id="save-item-submit-btn">${isEdit ? 'Save Changes' : 'Encrypt & Save'}</button>
        </div>
      `,
      onOpen: (modalEl) => {
        const passInput = modalEl.querySelector('#item-password');
        const fillBar = modalEl.querySelector('#modal-strength-fill');
        const genPassBtn = modalEl.querySelector('#modal-gen-pass-btn');

        const updateMeter = () => {
          const strength = Vault.calculateStrength(passInput.value);
          fillBar.style.width = `${strength.score * 20}%`;
          fillBar.style.backgroundColor = strength.color;
        };

        passInput.addEventListener('input', updateMeter);
        updateMeter();

        genPassBtn.addEventListener('click', () => {
          passInput.value = Vault.generatePassword({ length: 18 });
          updateMeter();
        });

        modalEl.querySelector('#save-item-submit-btn').addEventListener('click', async () => {
          const title = modalEl.querySelector('#item-title').value.trim();
          if (!title) return;

          const data = {
            title,
            category: modalEl.querySelector('#item-category').value,
            username: modalEl.querySelector('#item-username').value,
            password: passInput.value,
            url: modalEl.querySelector('#item-url').value,
            notes: modalEl.querySelector('#item-notes').value
          };

          if (isEdit) {
            await Vault.updateItem(existing.id, data);
          } else {
            await Vault.addItem(data);
          }

          Modal.close(modalEl.closest('.modal-backdrop'));
          window.AppRouter?.handleRouting();
        });
      }
    });
  },

  openGeneratorModal() {
    Modal.open({
      title: 'Cryptographic Password Generator',
      content: `
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2" style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-md);">
            <input type="text" id="gen-result" class="input-field font-mono" readonly style="font-size: 1.1rem; letter-spacing: 0.05em;" />
            <button class="btn btn-secondary btn-sm" id="gen-copy-btn">Copy</button>
          </div>

          <div class="form-group">
            <div class="flex justify-between items-center text-xs">
              <label class="form-label">Length: <span id="gen-len-val">18</span> characters</label>
            </div>
            <input type="range" id="gen-length-slider" min="8" max="48" value="18" style="width: 100%; accent-color: var(--accent-primary);" />
          </div>

          <div class="flex flex-col gap-2 text-xs">
            <label class="flex items-center gap-2"><input type="checkbox" id="gen-upper" checked /> Uppercase Letters (A-Z)</label>
            <label class="flex items-center gap-2"><input type="checkbox" id="gen-lower" checked /> Lowercase Letters (a-z)</label>
            <label class="flex items-center gap-2"><input type="checkbox" id="gen-num" checked /> Numbers (0-9)</label>
            <label class="flex items-center gap-2"><input type="checkbox" id="gen-sym" checked /> Symbols (!@#$%...)</label>
          </div>
        </div>
      `,
      footer: `
        <div class="flex justify-between items-center w-full">
          <button class="btn btn-secondary btn-sm" id="gen-regenerate-btn">Regenerate ⟳</button>
          <button class="btn btn-primary btn-sm" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Done</button>
        </div>
      `,
      onOpen: (modalEl) => {
        const resultInput = modalEl.querySelector('#gen-result');
        const slider = modalEl.querySelector('#gen-length-slider');
        const lenVal = modalEl.querySelector('#gen-len-val');
        const copyBtn = modalEl.querySelector('#gen-copy-btn');
        const regenBtn = modalEl.querySelector('#gen-regenerate-btn');

        const generate = () => {
          const len = parseInt(slider.value, 10);
          lenVal.textContent = len;
          const pwd = Vault.generatePassword({
            length: len,
            uppercase: modalEl.querySelector('#gen-upper').checked,
            lowercase: modalEl.querySelector('#gen-lower').checked,
            numbers: modalEl.querySelector('#gen-num').checked,
            symbols: modalEl.querySelector('#gen-sym').checked
          });
          resultInput.value = pwd;
        };

        slider.addEventListener('input', generate);
        regenBtn.addEventListener('click', generate);
        modalEl.querySelectorAll('input[type="checkbox"]').forEach(c => c.addEventListener('change', generate));
        copyBtn.addEventListener('click', () => {
          Vault.copyToClipboard(resultInput.value, 'Generated Password');
        });

        generate();
      }
    });
  }
};
