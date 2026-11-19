/**
 * GOSH CLOUD MODULE (PHASE 6)
 * Dedicated 20 GB MEGA Cloud Storage: Folders, File Operations, Previews & Quota.
 */

import { Icons } from '../../components/icons.js';
import { DB } from '../../services/db.service.js';
import { Mega } from '../../services/mega.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';
import { State } from '../../state.js';

export const CloudModule = {
  currentFolderId: null, // null = Root directory
  activeCategory: 'all',  // 'all', 'document', 'memory', 'attachment'
  searchQuery: '',

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  async render() {
    // 1. Fetch Folders & Files from Database
    const [allFolders, allFiles, quota] = await Promise.all([
      DB.query('folders').catch(() => []),
      DB.query('files').catch(() => []),
      Mega.getQuota()
    ]);

    // Current Folder Info
    const currentFolder = this.currentFolderId 
      ? allFolders.find(f => f.id === this.currentFolderId)
      : null;

    // Filter subfolders for current directory
    const folders = allFolders.filter(f => f.parent_id === this.currentFolderId);

    // Filter files for current directory
    let files = allFiles.filter(f => f.folder_id === this.currentFolderId);

    // Apply category filter
    if (this.activeCategory !== 'all') {
      files = files.filter(f => f.category === this.activeCategory);
    }

    // Apply search filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(q));
    }

    return `
      <div class="view-container">
        <!-- Top Cloud Header & Action Bar -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="flex items-center gap-2" style="margin-bottom: var(--space-2); flex-wrap: wrap;">
              <span class="badge badge-violet">Sovereign Memory Wallet</span>
              <a href="${Mega.getAccountUrl()}" target="_blank" rel="noopener noreferrer" class="badge badge-champagne" style="text-decoration: none;" title="Open Connected MEGA Storage">
                ● Connected: 1ixlVZLR
              </a>
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">Memory Wallet</h1>
            <p class="text-muted">Zero-cost private cloud drive (GOSH Cloud) powered by dedicated 20 GB MEGA account.</p>
          </div>
          <div class="flex gap-2 items-center">
            <!-- Hidden native file input -->
            <input type="file" id="cloud-file-input" style="display: none;" multiple />
            
            <a href="${Mega.getAccountUrl()}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" title="Open Connected MEGA Account in New Tab" style="display: inline-flex; align-items: center; gap: 4px;">
              <span>Open MEGA</span>
              <span>↗</span>
            </a>
            <button class="btn btn-secondary" id="new-folder-btn">
              + New Folder
            </button>
            <button class="btn btn-primary" id="cloud-upload-btn">
              ${Icons.cloud}
              <span>Upload Files</span>
            </button>
          </div>
        </div>

        <!-- Real-Time Storage Quota Card -->
        <div class="card" style="margin-bottom: var(--space-5);">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">Storage Quota</span>
              <span class="badge badge-champagne text-xs">Free Tier Active</span>
            </div>
            <span class="text-xs text-muted">
              ${this.formatBytes(quota.usedBytes)} of 20.0 GB (${quota.usedPercent}%)
            </span>
          </div>
          <div style="background: var(--border-subtle); height: 8px; border-radius: var(--radius-full); margin-top: var(--space-3); overflow: hidden;">
            <div style="background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); width: ${Math.max(0.5, quota.usedPercent)}%; height: 100%; transition: width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Filter, Breadcrumbs & Search Controls -->
        <div class="card" style="margin-bottom: var(--space-4); padding: 12px 18px;">
          <div class="flex justify-between items-center flex-wrap gap-3">
            <!-- Breadcrumbs Navigation -->
            <div class="flex items-center gap-2 text-sm">
              <button class="btn btn-ghost btn-sm breadcrumb-btn" data-folder-id="" style="font-weight: ${!this.currentFolderId ? '700' : '400'}; color: ${!this.currentFolderId ? 'var(--text-primary)' : 'var(--text-muted)'}; padding: 4px 8px;">
                Root Drive
              </button>
              ${currentFolder ? `
                <span class="text-muted">/</span>
                <span class="badge badge-violet" style="font-weight: 600;">
                  ${currentFolder.name}
                </span>
              ` : ''}
            </div>

            <!-- Category Filter Chips -->
            <div class="flex gap-1">
              <button class="btn btn-sm category-chip ${this.activeCategory === 'all' ? 'btn-primary' : 'btn-ghost'}" data-category="all">All</button>
              <button class="btn btn-sm category-chip ${this.activeCategory === 'document' ? 'btn-primary' : 'btn-ghost'}" data-category="document">Documents</button>
              <button class="btn btn-sm category-chip ${this.activeCategory === 'memory' ? 'btn-primary' : 'btn-ghost'}" data-category="memory">Photos/Videos</button>
              <button class="btn btn-sm category-chip ${this.activeCategory === 'attachment' ? 'btn-primary' : 'btn-ghost'}" data-category="attachment">Attachments</button>
            </div>

            <!-- Search Field -->
            <input 
              type="text" 
              id="cloud-search-input" 
              class="input-field" 
              placeholder="Filter files..." 
              value="${this.searchQuery}" 
              style="max-width: 200px; padding: 6px 12px; font-size: var(--text-xs);" 
            />
          </div>
        </div>

        <!-- Folders Section (If any in current view) -->
        ${folders.length > 0 ? `
          <div class="card" style="margin-bottom: var(--space-5);">
            <div class="card-header">
              <h2 class="card-title text-sm">Folders (${folders.length})</h2>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3);">
              ${folders.map(folder => {
                const count = allFiles.filter(f => f.folder_id === folder.id).length;
                return `
                  <div class="card card-interactive folder-item" data-folder-id="${folder.id}" style="padding: var(--space-4); background: var(--bg-surface-hover); border-top: 3px solid ${folder.color || 'var(--accent-primary)'};">
                    <div class="flex justify-between items-start">
                      <div style="color: ${folder.color || 'var(--accent-primary)'}; margin-bottom: 6px;">
                        ${Icons.cloud}
                      </div>
                      <button class="btn btn-icon btn-ghost btn-sm folder-menu-btn" data-folder-id="${folder.id}" title="Folder Options" style="width: 24px; height: 24px;">
                        ${Icons.more}
                      </button>
                    </div>
                    <div class="text-sm font-semibold truncate" style="color: var(--text-primary);">${folder.name}</div>
                    <div class="text-xs text-muted" style="margin-top: 2px;">${count} item${count === 1 ? '' : 's'}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Files Section -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title text-sm">Files (${files.length})</h2>
            <span class="text-xs text-muted">${files.reduce((a, b) => a + Number(b.file_size || 0), 0) > 0 ? this.formatBytes(files.reduce((a, b) => a + Number(b.file_size || 0), 0)) : ''}</span>
          </div>

          ${files.length === 0 ? `
            <div class="empty-state" style="padding: 48px var(--space-4);">
              <div class="empty-state-icon">${Icons.cloud}</div>
              <h4 class="card-title text-sm">No Files in This Directory</h4>
              <p class="text-xs text-muted" style="margin-top: 4px;">Click "Upload Files" to store documents, photos, and media directly in MEGA.</p>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              ${files.map(file => {
                const isImg = file.mime_type.startsWith('image/');
                const isVid = file.mime_type.startsWith('video/');
                const isPdf = file.mime_type.includes('pdf');
                let typeIcon = Icons.documents;
                if (isImg || isVid) typeIcon = Icons.memories;

                return `
                  <div class="card flex justify-between items-center file-row" style="padding: 12px 16px; background: var(--bg-surface-hover);">
                    <div class="flex items-center gap-3 truncate">
                      <div style="color: var(--accent-primary); flex-shrink: 0;">${typeIcon}</div>
                      <div class="truncate">
                        <div class="text-sm font-semibold truncate">${file.name}</div>
                        <div class="text-xs text-muted">
                          ${this.formatBytes(file.file_size)} • ${new Date(file.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button class="btn btn-secondary btn-sm preview-file-btn" data-file-id="${file.id}">
                        Preview
                      </button>
                      <button class="btn btn-icon btn-ghost btn-sm download-file-btn" data-file-id="${file.id}" title="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      </button>
                      <button class="btn btn-icon btn-ghost btn-sm file-menu-btn" data-file-id="${file.id}" title="More Options">
                        ${Icons.more}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  mount(container) {
    const uploadBtn = container.querySelector('#cloud-upload-btn');
    const fileInput = container.querySelector('#cloud-file-input');
    const newFolderBtn = container.querySelector('#new-folder-btn');
    const searchInput = container.querySelector('#cloud-search-input');

    // 1. File Upload with Progress Feedback
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const filesList = Array.from(e.target.files);
        if (filesList.length === 0) return;

        for (const file of filesList) {
          await Mega.uploadFile(file, this.currentFolderId, 'cloud', (pct) => {
            console.log(`[MEGA UPLOAD] ${file.name}: ${pct}%`);
          });
        }

        window.AppRouter?.handleRouting();
      });
    }

    // 2. New Folder Creator Modal
    if (newFolderBtn) {
      newFolderBtn.addEventListener('click', () => {
        Modal.open({
          title: 'Create Memory Wallet Folder',
          content: `
            <div class="flex flex-col gap-3">
              <div class="form-group">
                <label class="form-label" for="folder-name-input">Folder Name</label>
                <input type="text" id="folder-name-input" class="input-field" placeholder="e.g. Travel Documents" required autofocus />
              </div>
              <div class="form-group">
                <label class="form-label">Folder Color</label>
                <div class="flex gap-2">
                  <button type="button" class="color-pill" data-color="#8b5cf6" style="width: 28px; height: 28px; border-radius: 50%; background: #8b5cf6; border: 2px solid #ffffff; cursor: pointer;"></button>
                  <button type="button" class="color-pill" data-color="#38bdf8" style="width: 28px; height: 28px; border-radius: 50%; background: #38bdf8; border: 2px solid transparent; cursor: pointer;"></button>
                  <button type="button" class="color-pill" data-color="#10b981" style="width: 28px; height: 28px; border-radius: 50%; background: #10b981; border: 2px solid transparent; cursor: pointer;"></button>
                  <button type="button" class="color-pill" data-color="#f5e0b7" style="width: 28px; height: 28px; border-radius: 50%; background: #f5e0b7; border: 2px solid transparent; cursor: pointer;"></button>
                </div>
              </div>
            </div>
          `,
          footer: `
            <div class="flex gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Cancel</button>
              <button class="btn btn-primary" id="confirm-create-folder-btn">Create Folder</button>
            </div>
          `,
          onOpen: (modalEl) => {
            let selectedColor = '#8b5cf6';
            modalEl.querySelectorAll('.color-pill').forEach(pill => {
              pill.addEventListener('click', () => {
                modalEl.querySelectorAll('.color-pill').forEach(p => p.style.borderColor = 'transparent');
                pill.style.borderColor = '#ffffff';
                selectedColor = pill.getAttribute('data-color');
              });
            });

            const confirmBtn = modalEl.querySelector('#confirm-create-folder-btn');
            const nameInput = modalEl.querySelector('#folder-name-input');
            confirmBtn.addEventListener('click', async () => {
              const name = nameInput.value.trim();
              if (!name) return;
              await Mega.createFolder(name, this.currentFolderId, selectedColor);
              Modal.close(modalEl.closest('.modal-backdrop'));
              window.AppRouter?.handleRouting();
            });
          }
        });
      });
    }

    // 3. Folder Navigation
    container.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.folder-menu-btn')) return; // Ignore if clicking menu
        const folderId = item.getAttribute('data-folder-id');
        this.currentFolderId = folderId;
        window.AppRouter?.handleRouting();
      });
    });

    // 4. Breadcrumbs
    container.querySelectorAll('.breadcrumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFolderId = null;
        window.AppRouter?.handleRouting();
      });
    });

    // 5. Category Chips
    container.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeCategory = chip.getAttribute('data-category');
        window.AppRouter?.handleRouting();
      });
    });

    // 6. Search Input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          window.AppRouter?.handleRouting();
        }, 200);
      });
    }

    // 7. Preview File Modal
    container.querySelectorAll('.preview-file-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fileId = btn.getAttribute('data-file-id');
        const preview = await Mega.getFilePreviewData(fileId);
        if (!preview) return;

        const { file, previewUrl } = preview;
        const isImg = file.mime_type.startsWith('image/');
        const isVid = file.mime_type.startsWith('video/');

        Modal.open({
          title: file.name,
          content: `
            <div class="flex flex-col items-center justify-center gap-3">
              ${isImg && previewUrl ? `
                <img src="${previewUrl}" alt="${file.name}" style="max-height: 400px; max-width: 100%; border-radius: var(--radius-md);" />
              ` : isVid && previewUrl ? `
                <video controls src="${previewUrl}" style="max-height: 400px; max-width: 100%; border-radius: var(--radius-md);"></video>
              ` : `
                <div class="empty-state" style="padding: 24px;">
                  <div class="empty-state-icon">${Icons.documents}</div>
                  <h4 class="card-title text-sm">${file.name}</h4>
                  <p class="text-xs text-muted" style="margin-top: 4px;">Size: ${this.formatBytes(file.file_size)} • Type: ${file.mime_type}</p>
                </div>
              `}
            </div>
          `,
          footer: `
            <div class="flex justify-between items-center w-full">
              <span class="text-xs text-muted">${this.formatBytes(file.file_size)}</span>
              <div class="flex gap-2">
                <button class="btn btn-secondary" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Close</button>
                <button class="btn btn-primary" id="modal-download-btn">Download</button>
              </div>
            </div>
          `,
          onOpen: (modalEl) => {
            const dlBtn = modalEl.querySelector('#modal-download-btn');
            if (dlBtn) {
              dlBtn.addEventListener('click', () => {
                Mega.downloadFile(file.id);
              });
            }
          }
        });
      });
    });

    // 8. Download File Button
    container.querySelectorAll('.download-file-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fileId = btn.getAttribute('data-file-id');
        Mega.downloadFile(fileId);
      });
    });

    // 9. File Options (Rename / Delete)
    container.querySelectorAll('.file-menu-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fileId = btn.getAttribute('data-file-id');
        const file = await DB.getById('files', fileId);
        if (!file) return;

        Modal.open({
          title: `File Actions: ${file.name}`,
          content: `
            <div class="flex flex-col gap-2">
              <button class="btn btn-secondary text-left action-rename-btn">
                ✎ Rename File
              </button>
              <button class="btn btn-danger text-left action-delete-btn">
                🗑 Delete File from MEGA
              </button>
            </div>
          `,
          onOpen: (modalEl) => {
            const renameBtn = modalEl.querySelector('.action-rename-btn');
            const deleteBtn = modalEl.querySelector('.action-delete-btn');

            renameBtn.addEventListener('click', () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              const newName = prompt('Enter new file name:', file.name);
              if (newName && newName.trim() !== file.name) {
                Mega.renameFile(fileId, newName.trim());
                window.AppRouter?.handleRouting();
              }
            });

            deleteBtn.addEventListener('click', () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              Modal.confirm({
                title: 'Delete File',
                message: `Are you sure you want to permanently delete "${file.name}"?`,
                isDanger: true,
                confirmText: 'Delete',
                onConfirm: async () => {
                  await Mega.deleteFile(fileId);
                  window.AppRouter?.handleRouting();
                }
              });
            });
          }
        });
      });
    });

    // 10. Folder Options (Rename / Delete)
    container.querySelectorAll('.folder-menu-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const folderId = btn.getAttribute('data-folder-id');
        const folder = await DB.getById('folders', folderId);
        if (!folder) return;

        Modal.open({
          title: `Folder Actions: ${folder.name}`,
          content: `
            <div class="flex flex-col gap-2">
              <button class="btn btn-secondary text-left folder-rename-btn">
                ✎ Rename Folder
              </button>
              <button class="btn btn-danger text-left folder-delete-btn">
                🗑 Delete Folder & Contents
              </button>
            </div>
          `,
          onOpen: (modalEl) => {
            modalEl.querySelector('.folder-rename-btn').addEventListener('click', () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              const newName = prompt('Enter new folder name:', folder.name);
              if (newName && newName.trim() !== folder.name) {
                Mega.renameFolder(folderId, newName.trim());
                window.AppRouter?.handleRouting();
              }
            });

            modalEl.querySelector('.folder-delete-btn').addEventListener('click', () => {
              Modal.close(modalEl.closest('.modal-backdrop'));
              Modal.confirm({
                title: 'Delete Folder',
                message: `Delete folder "${folder.name}" and all its contained files?`,
                isDanger: true,
                confirmText: 'Delete Folder',
                onConfirm: async () => {
                  await Mega.deleteFolder(folderId);
                  window.AppRouter?.handleRouting();
                }
              });
            });
          }
        });
      });
    });

    // 11. Real-Time DB Subscriptions
    this.unsubFiles = DB.subscribe('files', () => {
      if (State.get('activeRoute') === 'cloud') {
        window.AppRouter?.handleRouting();
      }
    });

    this.unsubFolders = DB.subscribe('folders', () => {
      if (State.get('activeRoute') === 'cloud') {
        window.AppRouter?.handleRouting();
      }
    });
  },

  unmount() {
    if (this.unsubFiles) this.unsubFiles();
    if (this.unsubFolders) this.unsubFolders();
  }
};
