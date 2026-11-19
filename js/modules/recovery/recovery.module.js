/**
 * GOSH DISASTER RECOVERY MODULE (PHASE 10)
 * Emergency 24-Word Mnemonic Seeds, Encrypted JSON Backups, Master Key Rotation, and Restoration.
 */

import { Icons } from '../../components/icons.js';
import { Recovery } from '../../services/recovery.service.js';
import { DB } from '../../services/db.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const RecoveryModule = {
  activeMnemonic: null,
  showMnemonicWords: false,

  async render() {
    const recoveryRecords = await DB.query('recovery_records', null, (a, b) => new Date(b.created_at) - new Date(a.created_at)).catch(() => []);
    const latestVersion = recoveryRecords.length > 0 ? recoveryRecords[0].key_version : 1;

    return `
      <div class="view-container">
        <!-- Top Title & Badge Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">
              Zero-Trust Disaster Recovery Center
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Recovery & Key Rotation</h1>
            <p class="text-muted">Generate offline 24-word seeds, export encrypted emergency kits, and rotate master keys.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-violet">Master Key v${latestVersion}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-6);">
          <!-- 1. 24-WORD EMERGENCY RECOVERY SEED -->
          <div class="card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="flex justify-between items-start" style="margin-bottom: var(--space-3);">
                <div class="brand-emblem" style="width: 44px; height: 44px; font-size: 1.25rem;">
                  ${Icons.recovery}
                </div>
                <span class="badge badge-champagne text-xs">BIP-39 Standard</span>
              </div>
              <h2 class="card-title" style="font-size: var(--text-md); margin-bottom: var(--space-2);">24-Word Emergency Seed</h2>
              <p class="text-xs text-muted" style="line-height: 1.5; margin-bottom: var(--space-4);">
                Generate a 24-word cryptographic mnemonic phrase to write down on paper and store in a physical safe for emergency device disaster recovery.
              </p>

              ${this.activeMnemonic ? `
                <div style="background: #0d0e14; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 12px; margin-bottom: var(--space-3);">
                  <div class="flex justify-between items-center" style="margin-bottom: 8px;">
                    <span class="text-xs text-muted">24 Secret Words</span>
                    <button class="btn btn-sm btn-secondary" id="toggle-seed-visibility-btn" style="font-size: 10px; padding: 2px 8px;">
                      ${this.showMnemonicWords ? 'Hide Words' : 'Show Words'}
                    </button>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-family: var(--font-mono); font-size: 11px;">
                    ${this.activeMnemonic.split(' ').map((word, i) => `
                      <div style="background: rgba(255,255,255,0.04); padding: 4px 6px; border-radius: 4px;">
                        <span style="color: var(--accent-primary);">${i + 1}.</span> ${this.showMnemonicWords ? word : '••••••'}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="flex gap-2" style="margin-top: var(--space-4);">
              <button class="btn btn-secondary btn-sm" id="gen-mnemonic-btn" style="flex: 1;">
                ${this.activeMnemonic ? 'Regenerate Seed' : 'Generate 24 Words'}
              </button>
              ${this.activeMnemonic ? `
                <button class="btn btn-primary btn-sm" id="copy-mnemonic-btn">
                  Copy Words
                </button>
              ` : ''}
            </div>
          </div>

          <!-- 2. ENCRYPTED EMERGENCY JSON KIT -->
          <div class="card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="flex justify-between items-start" style="margin-bottom: var(--space-3);">
                <div class="brand-emblem" style="width: 44px; height: 44px; font-size: 1.25rem;">
                  ${Icons.vault}
                </div>
                <span class="badge badge-violet text-xs">AES-256 Backed</span>
              </div>
              <h2 class="card-title" style="font-size: var(--text-md); margin-bottom: var(--space-2);">Encrypted JSON Recovery Kit</h2>
              <p class="text-xs text-muted" style="line-height: 1.5; margin-bottom: var(--space-4);">
                Export a tamper-evident, SHA-256 verified JSON recovery archive containing all zero-knowledge encrypted vault items and verification hashes.
              </p>
            </div>

            <div class="flex flex-col gap-2" style="margin-top: var(--space-4);">
              <button class="btn btn-accent btn-sm" id="export-json-kit-btn">
                Export Emergency Kit (.json)
              </button>
              <button class="btn btn-secondary btn-sm" id="restore-json-kit-btn">
                Restore from Emergency Kit
              </button>
            </div>
          </div>

          <!-- 3. MASTER KEY ROTATION -->
          <div class="card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="flex justify-between items-start" style="margin-bottom: var(--space-3);">
                <div class="brand-emblem" style="width: 44px; height: 44px; font-size: 1.25rem;">
                  ${Icons.settings}
                </div>
                <span class="badge badge-danger text-xs">Security Action</span>
              </div>
              <h2 class="card-title" style="font-size: var(--text-md); margin-bottom: var(--space-2);">Master Key Rotation</h2>
              <p class="text-xs text-muted" style="line-height: 1.5; margin-bottom: var(--space-4);">
                Rotate your Master Encryption Passphrase. Decrypts all existing credentials in memory and securely re-encrypts every item with a brand new salt and AES-256-GCM key.
              </p>
            </div>

            <div style="margin-top: var(--space-4);">
              <button class="btn btn-primary btn-sm" id="rotate-key-btn" style="width: 100%;">
                Rotate Master Passphrase
              </button>
            </div>
          </div>
        </div>

        <!-- 4. KEY ROTATION & RECOVERY AUDIT LOG -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Key Versions & Recovery Audit</h2>
            <span class="text-xs text-muted">Immutable Version Trail</span>
          </div>

          ${recoveryRecords.length === 0 ? `
            <div class="empty-state" style="padding: var(--space-6);">
              <div class="empty-state-icon">${Icons.recovery}</div>
              <p class="text-sm font-semibold">Initial Key Version 1 Active</p>
              <p class="text-xs text-muted">Key rotation history and disaster recovery timestamps will appear here.</p>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              ${recoveryRecords.map(rec => `
                <div class="flex justify-between items-center" style="padding: 10px 16px; background: var(--bg-surface-hover); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div>
                    <div class="text-sm font-semibold flex items-center gap-2">
                      <span class="badge badge-violet text-xs">Version ${rec.key_version}</span>
                      <span style="color: var(--text-primary); font-family: var(--font-mono); font-size: 11px;">${rec.encrypted_key_bundle}</span>
                    </div>
                    <div class="text-xs text-muted" style="margin-top: 2px;">
                      Verification Hash: ${rec.verification_hash.substring(0, 20)}...
                    </div>
                  </div>
                  <span class="text-xs text-muted">${new Date(rec.created_at).toLocaleDateString()}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  mount() {
    // Generate Mnemonic Seed
    const genMnemonicBtn = document.getElementById('gen-mnemonic-btn');
    if (genMnemonicBtn) {
      genMnemonicBtn.addEventListener('click', () => {
        this.activeMnemonic = Recovery.generateMnemonic(24);
        this.showMnemonicWords = true;
        Toast.success('Mnemonic Generated', '24-word emergency recovery phrase created.');
        this.refreshView();
      });
    }

    // Toggle Words Visibility
    const toggleVisBtn = document.getElementById('toggle-seed-visibility-btn');
    if (toggleVisBtn) {
      toggleVisBtn.addEventListener('click', () => {
        this.showMnemonicWords = !this.showMnemonicWords;
        this.refreshView();
      });
    }

    // Copy Mnemonic Seed
    const copyMnemonicBtn = document.getElementById('copy-mnemonic-btn');
    if (copyMnemonicBtn) {
      copyMnemonicBtn.addEventListener('click', () => {
        if (this.activeMnemonic && typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(this.activeMnemonic);
          Toast.success('Copied', '24-word recovery seed copied to clipboard.');
        }
      });
    }

    // Export JSON Kit
    const exportJsonBtn = document.getElementById('export-json-kit-btn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', async () => {
        const bundle = await Recovery.exportEmergencyKit();
        const jsonStr = JSON.stringify(bundle, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gosh-emergency-kit-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.success('Emergency Kit Exported', 'Downloaded encrypted JSON archive with SHA-256 checksum.');
      });
    }

    // Restore JSON Kit Modal
    const restoreJsonBtn = document.getElementById('restore-json-kit-btn');
    if (restoreJsonBtn) {
      restoreJsonBtn.addEventListener('click', () => {
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Select GOSH Emergency Kit JSON</label>
              <input type="file" id="recovery-file-input" class="input-field" accept=".json" />
            </div>
            <div>
              <label class="form-label">Or Paste Emergency JSON Content</label>
              <textarea id="recovery-json-text" class="input-field" rows="6" placeholder='Paste {"format": "GOSH_ENCRYPTED_EMERGENCY_RECOVERY_KIT", ...}'></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-danger" id="execute-restore-btn">Restore Vault</button>
            </div>
          </div>
        `;

        Modal.show('Disaster Recovery Restoration', modalHtml);

        setTimeout(() => {
          const fileInput = document.getElementById('recovery-file-input');
          const textArea = document.getElementById('recovery-json-text');
          if (fileInput) {
            fileInput.addEventListener('change', (e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                  textArea.value = re.target.result;
                };
                reader.readAsText(file);
              }
            });
          }

          const execBtn = document.getElementById('execute-restore-btn');
          if (execBtn) {
            execBtn.addEventListener('click', async () => {
              const rawJson = textArea.value.trim();
              if (!rawJson) {
                Toast.error('Input Required', 'Please choose a file or paste recovery JSON.');
                return;
              }

              try {
                const bundle = JSON.parse(rawJson);
                await Recovery.restoreFromEmergencyKit(bundle);
                Modal.close();
                this.refreshView();
              } catch (err) {
                Toast.error('Restore Failed', err.message || 'Corrupted recovery file.');
              }
            });
          }
        }, 50);
      });
    }

    // Rotate Key Modal
    const rotateKeyBtn = document.getElementById('rotate-key-btn');
    if (rotateKeyBtn) {
      rotateKeyBtn.addEventListener('click', () => {
        const modalHtml = `
          <div class="flex flex-col gap-4">
            <div>
              <label class="form-label">Current Master Passphrase</label>
              <input type="password" id="old-passphrase-input" class="input-field" placeholder="Enter existing passphrase" />
            </div>
            <div>
              <label class="form-label">New Master Passphrase (Min 8 chars)</label>
              <input type="password" id="new-passphrase-input" class="input-field" placeholder="Enter new master passphrase" />
            </div>
            <div>
              <label class="form-label">Confirm New Passphrase</label>
              <input type="password" id="confirm-new-passphrase-input" class="input-field" placeholder="Confirm new master passphrase" />
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
              <button class="btn btn-primary" id="execute-rotate-key-btn">Re-Encrypt Vault</button>
            </div>
          </div>
        `;

        Modal.show('Rotate Master Encryption Passphrase', modalHtml);

        setTimeout(() => {
          const execRotateBtn = document.getElementById('execute-rotate-key-btn');
          if (execRotateBtn) {
            execRotateBtn.addEventListener('click', async () => {
              const oldPass = document.getElementById('old-passphrase-input').value;
              const newPass = document.getElementById('new-passphrase-input').value;
              const confirmPass = document.getElementById('confirm-new-passphrase-input').value;

              if (!oldPass || !newPass) {
                Toast.error('Required Fields', 'Please fill in both current and new passphrases.');
                return;
              }

              if (newPass !== confirmPass) {
                Toast.error('Mismatch', 'New passphrases do not match.');
                return;
              }

              if (newPass.length < 8) {
                Toast.error('Too Short', 'Passphrase must be at least 8 characters long.');
                return;
              }

              try {
                await Recovery.rotateMasterKey(oldPass, newPass);
                Modal.close();
                this.refreshView();
              } catch (err) {
                Toast.error('Rotation Failed', err.message || 'Key rotation error.');
              }
            });
          }
        }, 50);
      });
    }
  },

  async refreshView() {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (main && window.location.hash === '#recovery') {
      main.innerHTML = await this.render();
      this.mount();
    }
  }
};
