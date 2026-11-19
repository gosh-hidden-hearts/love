/**
 * GOSH DOCUMENT LOCKER MODULE (PHASE 7)
 * Confidential Certificate & Document Management via Client-Encrypted MEGA Storage.
 */

import { Icons } from '../../components/icons.js';
import { DB } from '../../services/db.service.js';
import { Mega } from '../../services/mega.service.js';
import { Crypto } from '../../services/crypto.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const DocumentsModule = {
  activeCategory: 'all', // 'all', 'identity', 'financial', 'medical', 'legal', 'personal'
  searchQuery: '',

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  async render() {
    // 1. Fetch Documents & Linked File Records
    const [docs, allFiles] = await Promise.all([
      DB.query('documents').catch(() => []),
      DB.query('files').catch(() => [])
    ]);

    // Join document metadata with file details
    const joinedDocs = docs.map(doc => {
      const file = allFiles.find(f => f.id === doc.file_id) || {};
      return {
        ...doc,
        fileName: file.name || doc.title,
        fileSize: file.file_size || 0,
        mimeType: file.mime_type || 'application/pdf',
        megaHandle: file.mega_handle,
        isEncrypted: file.is_encrypted
      };
    });

    // Filter by Category
    let filteredDocs = this.activeCategory === 'all'
      ? joinedDocs
      : joinedDocs.filter(d => d.category === this.activeCategory);

    // Filter by Search Query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filteredDocs = filteredDocs.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.fileName.toLowerCase().includes(q) ||
        (d.notes && d.notes.toLowerCase().includes(q))
      );
    }

    return `
      <div class="view-container">
        <!-- Top Document Locker Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">
              Confidential Document Locker
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Document Locker</h1>
            <p class="text-muted">Passports, insurance, property deeds, health records, and legal certificates.</p>
          </div>
          <div>
            <button class="btn btn-primary" id="upload-doc-modal-btn">
              ${Icons.documents}
              <span>+ Secure Document</span>
            </button>
          </div>
        </div>

        <!-- Filter Chips & Search Bar -->
        <div class="card" style="margin-bottom: var(--space-5); padding: 12px 18px;">
          <div class="flex justify-between items-center flex-wrap gap-3">
            <div class="flex gap-1 flex-wrap">
              <button class="btn btn-sm doc-category-chip ${this.activeCategory === 'all' ? 'btn-primary' : 'btn-ghost'}" data-category="all">All (${joinedDocs.length})</button>
              <button class="btn btn-sm doc-category-chip ${this.activeCategory === 'identity' ? 'btn-primary' : 'btn-ghost'}" data-category="identity">Identity & Passports</button>
              <button class="btn btn-sm doc-category-chip ${this.activeCategory === 'financial' ? 'btn-primary' : 'btn-ghost'}" data-category="financial">Financial & Tax</button>
              <button class="btn btn-sm doc-category-chip ${this.activeCategory === 'medical' ? 'btn-primary' : 'btn-ghost'}" data-category="medical">Medical & Health</button>
              <button class="btn btn-sm doc-category-chip ${this.activeCategory === 'legal' ? 'btn-primary' : 'btn-ghost'}" data-category="legal">Legal & Contracts</button>
              <button class="btn btn-sm doc-category-chip ${this.activeCategory === 'personal' ? 'btn-primary' : 'btn-ghost'}" data-category="personal">Personal</button>
            </div>

            <input 
              type="text" 
              id="doc-search-input" 
              class="input-field" 
              placeholder="Search documents..." 
              value="${this.searchQuery}" 
              style="max-width: 220px; padding: 6px 12px; font-size: var(--text-xs);" 
            />
          </div>
        </div>

        <!-- Documents Table / Grid -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title text-sm">Protected Files (${filteredDocs.length})</h2>
            <span class="badge badge-violet text-xs">AES-256-GCM Storage</span>
          </div>

          ${filteredDocs.length === 0 ? `
            <div class="empty-state" style="padding: 48px var(--space-4);">
              <div class="empty-state-icon">${Icons.documents}</div>
              <h4 class="card-title text-sm">No Documents in this Category</h4>
              <p class="text-xs text-muted" style="margin-top: 4px;">Click "+ Secure Document" to upload passports, insurance policies, or legal agreements.</p>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              ${filteredDocs.map(doc => `
                <div class="card flex justify-between items-center" style="padding: 12px 16px; background: var(--bg-surface-hover);">
                  <div class="flex items-center gap-3 truncate">
                    <div style="color: var(--accent-secondary); flex-shrink: 0;">${Icons.documents}</div>
                    <div class="truncate">
                      <div class="text-sm font-semibold truncate flex items-center gap-2">
                        <span>${doc.title}</span>
                        <span class="badge badge-champagne text-xs" style="text-transform: capitalize;">${doc.category}</span>
                      </div>
                      <div class="text-xs text-muted">
                        ${doc.fileName} • ${this.formatBytes(doc.fileSize)} • ${new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button class="btn btn-secondary btn-sm preview-doc-btn" data-doc-id="${doc.id}">
                      Preview
                    </button>
                    <button class="btn btn-icon btn-ghost btn-sm download-doc-btn" data-file-id="${doc.file_id}" title="Download">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    </button>
                    <button class="btn btn-icon btn-ghost btn-sm delete-doc-btn" data-doc-id="${doc.id}" data-file-id="${doc.file_id}" title="Delete">
                      🗑
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  mount(container) {
    const uploadBtn = container.querySelector('#upload-doc-modal-btn');
    const searchInput = container.querySelector('#doc-search-input');

    // 1. Upload Document Modal
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        Modal.open({
          title: 'Store Confidential Document',
          content: `
            <form id="doc-upload-form">
              <div class="form-group">
                <label class="form-label" for="doc-title-input">Document Title</label>
                <input type="text" id="doc-title-input" class="input-field" placeholder="e.g. Passport or Health Insurance Policy" required autofocus />
              </div>

              <div class="form-group">
                <label class="form-label" for="doc-category-select">Category</label>
                <select id="doc-category-select" class="input-field">
                  <option value="identity">Identity & Passports</option>
                  <option value="financial">Financial & Tax</option>
                  <option value="medical">Medical & Health</option>
                  <option value="legal">Legal & Contracts</option>
                  <option value="personal">Personal Documents</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="doc-file-select">Select File (PDF, Image, Certificate)</label>
                <input type="file" id="doc-file-select" class="input-field" accept="application/pdf,image/*" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="doc-notes-input">Confidential Notes (Optional)</label>
                <textarea id="doc-notes-input" class="input-field" rows="2" placeholder="Policy numbers, expiration dates, renewal info..."></textarea>
              </div>
            </form>
          `,
          footer: `
            <div class="flex gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Cancel</button>
              <button class="btn btn-primary" id="confirm-doc-upload-btn">Encrypt & Store</button>
            </div>
          `,
          onOpen: (modalEl) => {
            const confirmBtn = modalEl.querySelector('#confirm-doc-upload-btn');
            const fileSelect = modalEl.querySelector('#doc-file-select');
            const titleInput = modalEl.querySelector('#doc-title-input');
            const catSelect = modalEl.querySelector('#doc-category-select');
            const notesInput = modalEl.querySelector('#doc-notes-input');

            confirmBtn.addEventListener('click', async () => {
              const file = fileSelect.files[0];
              const title = titleInput.value.trim();
              if (!file || !title) return;

              confirmBtn.disabled = true;
              confirmBtn.innerHTML = '<span>Uploading to MEGA...</span>';

              try {
                // Upload file to MEGA via MegaService
                const fileRecord = await Mega.uploadFile(file, null, 'document');

                // Record document metadata in documents table
                await DB.insert('documents', {
                  file_id: fileRecord.id,
                  title,
                  category: catSelect.value,
                  notes: notesInput.value.trim(),
                  is_confidential: true
                });

                Modal.close(modalEl.closest('.modal-backdrop'));
                Toast.success('Document Protected', `"${title}" stored securely in MEGA.`);
                window.AppRouter?.handleRouting();
              } catch (err) {
                Toast.error('Upload Failed', err.message);
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<span>Encrypt & Store</span>';
              }
            });
          }
        });
      });
    }

    // 2. Search Field
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          window.AppRouter?.handleRouting();
        }, 200);
      });
    }

    // 3. Category Filter Chips
    container.querySelectorAll('.doc-category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeCategory = chip.getAttribute('data-category');
        window.AppRouter?.handleRouting();
      });
    });

    // 4. Download Document Button
    container.querySelectorAll('.download-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fileId = btn.getAttribute('data-file-id');
        Mega.downloadFile(fileId);
      });
    });

    // 5. Preview Document Button
    container.querySelectorAll('.preview-doc-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const docId = btn.getAttribute('data-doc-id');
        const doc = await DB.getById('documents', docId);
        if (!doc) return;

        const preview = await Mega.getFilePreviewData(doc.file_id);
        const previewUrl = preview?.previewUrl;
        const file = preview?.file;

        Modal.open({
          title: doc.title,
          content: `
            <div class="flex flex-col items-center justify-center gap-3">
              ${previewUrl && file?.mime_type.startsWith('image/') ? `
                <img src="${previewUrl}" alt="${doc.title}" style="max-height: 400px; max-width: 100%; border-radius: var(--radius-md);" />
              ` : `
                <div class="empty-state" style="padding: 24px;">
                  <div class="empty-state-icon" style="color: var(--accent-secondary);">${Icons.documents}</div>
                  <h4 class="card-title text-sm">${doc.title}</h4>
                  <p class="text-xs text-muted" style="margin-top: 4px;">Category: ${doc.category} • Confidential Record</p>
                  ${doc.notes ? `<p class="text-xs text-secondary" style="margin-top: 8px; background: var(--bg-surface-hover); padding: 8px; border-radius: 4px;">Notes: ${doc.notes}</p>` : ''}
                </div>
              `}
            </div>
          `,
          footer: `
            <div class="flex justify-between items-center w-full">
              <span class="badge badge-champagne text-xs">${doc.category}</span>
              <button class="btn btn-secondary" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Close</button>
            </div>
          `
        });
      });
    });

    // 6. Delete Document
    container.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = btn.getAttribute('data-doc-id');
        const fileId = btn.getAttribute('data-file-id');
        Modal.confirm({
          title: 'Delete Document',
          message: 'Are you sure you want to delete this document from the locker and MEGA?',
          isDanger: true,
          confirmText: 'Delete',
          onConfirm: async () => {
            await DB.delete('documents', docId);
            if (fileId) await Mega.deleteFile(fileId);
            Toast.info('Document Removed', 'Removed from Document Locker.');
            window.AppRouter?.handleRouting();
          }
        });
      });
    });
  }
};
