/**
 * GOSH FOUNDATION VIEW MODULES (PHASE 1 & 2)
 * High-fidelity, responsive UI structures for all 15 platform modules.
 */

import { Icons } from '../components/icons.js';
import { State } from '../state.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { AuthView } from './auth/auth.view.js';
import { Auth } from '../services/auth.service.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ConnectModule } from './connect/connect.module.js';

export const Views = {
  // 01. AUTHENTICATION VIEW (PHASE 2 MULTI-STEP FLOW)
  auth: AuthView,

  // 02. HOME DASHBOARD (PHASE 4 LIVE TELEMETRY & FEEDS)
  home: DashboardModule,

  // 03. CONNECT (PHASE 5 LIVE E2EE CHAT, MEDIA & REACTIONS)
  connect: ConnectModule,

  // 04. CALLS (WEBRTC)
  calls: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Calls</h1>
            <p class="text-muted">Direct P2P Encrypted Audio, Video & Screen Sharing</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" onclick="window.Toast.info('Voice Call', 'WebRTC signaling channel will be bound in Phase 8.')">
              ${Icons.calls}
              <span>Voice Call</span>
            </button>
            <button class="btn btn-primary" onclick="window.Toast.info('Video Call', 'WebRTC signaling channel will be bound in Phase 8.')">
              ${Icons.calls}
              <span>Video Call</span>
            </button>
          </div>
        </div>

        <!-- Video Call Stage Preview -->
        <div class="card" style="aspect-ratio: 16/9; max-height: 520px; background: #0a0b0e; border: 1px solid var(--border-medium); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; margin-bottom: var(--space-6); overflow: hidden;">
          <div class="text-center" style="z-index: 1;">
            <div class="brand-emblem" style="width: 64px; height: 64px; margin: 0 auto var(--space-4); font-size: 1.8rem;">G</div>
            <h3 style="font-size: var(--text-lg); font-weight: 600;">Call Lobby Ready</h3>
            <p class="text-muted" style="margin-top: 4px; font-size: var(--text-sm);">STUN/WebRTC Channel Standing By</p>
          </div>

          <!-- In-call Controls Overlay Bar -->
          <div style="position: absolute; bottom: 20px; display: flex; gap: var(--space-3); background: rgba(26, 27, 34, 0.9); padding: 10px 18px; border-radius: var(--radius-full); border: 1px solid var(--border-subtle); backdrop-filter: blur(8px);">
            <button class="btn btn-icon btn-secondary" title="Toggle Mic" onclick="this.classList.toggle('btn-danger')">${Icons.calls}</button>
            <button class="btn btn-icon btn-secondary" title="Toggle Camera" onclick="this.classList.toggle('btn-danger')">${Icons.memories}</button>
            <button class="btn btn-icon btn-secondary" title="Screen Share" onclick="window.Toast.info('Screen Share', 'MediaProjection & displayMedia will activate in Phase 8.')">${Icons.devices}</button>
            <button class="btn btn-icon btn-danger" title="End Call">${Icons.close}</button>
          </div>
        </div>

        <!-- Call History -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Recent Calls</h2>
            <span class="text-xs text-muted">Protected Log</span>
          </div>
          <div class="empty-state" style="padding: var(--space-6);">
            <div class="empty-state-icon">${Icons.calls}</div>
            <p class="text-sm font-semibold">No call records yet</p>
            <p class="text-xs text-muted">Calls made between authorized devices will be logged here.</p>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 05. VAULT (PASSWORD MANAGER)
  vault: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">AES-256-GCM Zero-Knowledge</div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Vault</h1>
            <p class="text-muted">Encrypted passwords, credentials, cards, and secure notes.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" onclick="window.Toast.info('Password Generator', 'Cryptographic generator available in Phase 7.')">
              ${Icons.unlock}
              <span>Generate</span>
            </button>
            <button class="btn btn-primary" onclick="window.Toast.info('New Credential', 'Phase 7 will provide encrypted entry creation.')">
              <span>+ Add Item</span>
            </button>
          </div>
        </div>

        <!-- Master Vault Unlock Banner -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6); background: var(--bg-surface-hover); border: 1px solid var(--accent-secondary-dark);">
          <div class="flex items-center gap-3">
            <div style="color: var(--accent-secondary);">${Icons.lock}</div>
            <div>
              <div class="text-sm font-semibold" style="color: var(--accent-secondary);">Vault is Currently Locked</div>
              <p class="text-xs text-muted" style="margin: 0;">Enter your master passphrase to decrypt credentials into memory.</p>
            </div>
          </div>
          <button class="btn btn-accent btn-sm" onclick="window.Toast.info('Vault Unlock', 'Passphrase entry and PBKDF2 derivation will be implemented in Phase 7.')">
            Unlock Vault
          </button>
        </div>

        <!-- Category Filter & Items List -->
        <div class="card">
          <div class="flex justify-between items-center" style="margin-bottom: var(--space-4);">
            <div class="flex gap-2">
              <button class="btn btn-secondary btn-sm">All Items (12)</button>
              <button class="btn btn-ghost btn-sm">Logins</button>
              <button class="btn btn-ghost btn-sm">Secure Notes</button>
              <button class="btn btn-ghost btn-sm">Cards</button>
            </div>
            <input type="text" class="input-field" placeholder="Search vault..." style="max-width: 240px; padding: 6px 12px; font-size: var(--text-xs);" />
          </div>

          <div class="flex flex-col gap-2">
            <div class="card flex justify-between items-center" style="padding: 12px 16px; background: var(--bg-surface-hover);">
              <div class="flex items-center gap-3">
                <div style="color: var(--accent-primary);">${Icons.vault}</div>
                <div>
                  <div class="text-sm font-semibold">Netflix Streaming</div>
                  <div class="text-xs text-muted">shared@family.com</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="badge badge-champagne">Encrypted</span>
                <button class="btn btn-icon btn-ghost btn-sm" title="Copy">${Icons.lock}</button>
              </div>
            </div>

            <div class="card flex justify-between items-center" style="padding: 12px 16px; background: var(--bg-surface-hover);">
              <div class="flex items-center gap-3">
                <div style="color: var(--accent-secondary);">${Icons.diary}</div>
                <div>
                  <div class="text-sm font-semibold">Home Wi-Fi Network Key</div>
                  <div class="text-xs text-muted">Secure Note</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="badge badge-champagne">Encrypted</span>
                <button class="btn btn-icon btn-ghost btn-sm" title="Copy">${Icons.lock}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 06. CLOUD (MEGA STORAGE)
  cloud: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <div class="badge badge-violet" style="margin-bottom: var(--space-2);">MEGA Free Tier Storage</div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Cloud</h1>
            <p class="text-muted">Dedicated 20 GB encrypted cloud drive for files and media.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" onclick="window.Toast.info('New Folder', 'Folder management via Supabase + MEGA active in Phase 6.')">
              + New Folder
            </button>
            <button class="btn btn-primary" onclick="window.Toast.info('File Upload', 'Streaming Edge Gateway upload active in Phase 6.')">
              ${Icons.cloud}
              <span>Upload File</span>
            </button>
          </div>
        </div>

        <!-- Storage Quota Bar -->
        <div class="card" style="margin-bottom: var(--space-6);">
          <div class="flex justify-between items-center">
            <span class="text-sm font-semibold">Storage Usage</span>
            <span class="text-xs text-muted">100 MB of 20.0 GB used</span>
          </div>
          <div style="background: var(--border-subtle); height: 8px; border-radius: var(--radius-full); margin-top: var(--space-3); overflow: hidden;">
            <div style="background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); width: 0.5%; height: 100%;"></div>
          </div>
        </div>

        <!-- Files & Folders View -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Root Directory</h2>
            <span class="text-xs text-muted">3 Folders • 14 Files</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3);">
            <div class="card card-interactive text-center" style="padding: var(--space-4); background: var(--bg-surface-hover);">
              <div style="color: var(--accent-primary); margin-bottom: 8px;">${Icons.cloud}</div>
              <div class="text-sm font-semibold truncate">Documents</div>
              <div class="text-xs text-muted">6 files</div>
            </div>
            <div class="card card-interactive text-center" style="padding: var(--space-4); background: var(--bg-surface-hover);">
              <div style="color: var(--color-info); margin-bottom: 8px;">${Icons.memories}</div>
              <div class="text-sm font-semibold truncate">Photo Albums</div>
              <div class="text-xs text-muted">24 items</div>
            </div>
            <div class="card card-interactive text-center" style="padding: var(--space-4); background: var(--bg-surface-hover);">
              <div style="color: var(--accent-secondary); margin-bottom: 8px;">${Icons.recovery}</div>
              <div class="text-sm font-semibold truncate">Encrypted Backups</div>
              <div class="text-xs text-muted">2 archives</div>
            </div>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 07. MEMORIES
  memories: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Memories</h1>
            <p class="text-muted">Shared photo albums, milestones, and video timeline.</p>
          </div>
          <button class="btn btn-primary" onclick="window.Toast.info('Upload Memory', 'Available in Phase 9.')">
            + New Memory
          </button>
        </div>

        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.memories}</div>
            <h3 class="card-title">Your Private Photo Story</h3>
            <p class="text-muted" style="max-width: 400px; margin-top: 6px;">
              Photos uploaded here are stored in your dedicated MEGA account and organized into timeline albums.
            </p>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 08. DIARY
  diary: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">Encrypted Journal</div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Diary</h1>
            <p class="text-muted">Daily shared reflections, thoughts, and memories.</p>
          </div>
          <button class="btn btn-primary" onclick="window.Toast.info('New Entry', 'Journaling with mood tags will be implemented in Phase 9.')">
            + Write Entry
          </button>
        </div>

        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.diary}</div>
            <h3 class="card-title">Shared Diary Ready</h3>
            <p class="text-muted" style="max-width: 400px; margin-top: 6px;">
              Both authorized users can read, add, and reflect upon journal entries together.
            </p>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 09. TOGETHER (CALENDAR, TASKS, EXPENSES)
  together: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Together</h1>
            <p class="text-muted">Shared calendar, countdowns, tasks, and shared expense planner.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" onclick="window.Toast.info('New Task', 'Available in Phase 9.')">+ Task</button>
            <button class="btn btn-primary" onclick="window.Toast.info('New Event', 'Available in Phase 9.')">+ Event</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6);">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Shared Calendar</h2>
              <span class="badge badge-violet">Monthly</span>
            </div>
            <p class="text-sm text-muted">Upcoming trips, anniversaries, and reminders.</p>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Shared Checklist</h2>
              <span class="badge badge-champagne">Tasks</span>
            </div>
            <p class="text-sm text-muted">Collaborative to-dos with real-time checkbox sync.</p>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 10. MUSIC
  music: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Music</h1>
            <p class="text-muted">Shared listening library, curated playlists, and favorite tracks.</p>
          </div>
          <button class="btn btn-primary" onclick="window.Toast.info('Add Music', 'Link sharing active in Phase 9.')">
            + Add Song Link
          </button>
        </div>

        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.music}</div>
            <h3 class="card-title">Shared Music Playlists</h3>
            <p class="text-muted" style="max-width: 420px; margin-top: 6px;">
              Organize favorite songs, YouTube, and streaming links in one shared music space without copyright liability.
            </p>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 11. DOCUMENT LOCKER
  documents: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">Encrypted Document Storage</div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Document Locker</h1>
            <p class="text-muted">Passports, insurance, certificates, and confidential PDFs.</p>
          </div>
          <button class="btn btn-primary" onclick="window.Toast.info('Upload Document', 'Encrypted file handler active in Phase 7.')">
            ${Icons.documents}
            <span>Upload Document</span>
          </button>
        </div>

        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.documents}</div>
            <h3 class="card-title">Encrypted Document Vault</h3>
            <p class="text-muted" style="max-width: 420px; margin-top: 6px;">
              Sensitive PDFs and certificates are encrypted client-side prior to storage on MEGA.
            </p>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 12. SMART SEARCH
  search: {
    render: () => `
      <div class="view-container">
        <div class="card" style="margin-bottom: var(--space-6);">
          <div class="card-header">
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Smart Search</h1>
            <span class="badge badge-violet">Unified Index</span>
          </div>
          <div class="flex gap-3">
            <input type="text" class="input-field" placeholder="Search messages, documents, files, memories, diary..." style="flex: 1;" />
            <button class="btn btn-primary">Search</button>
          </div>
        </div>

        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.search}</div>
            <h3 class="card-title">Unified Search Across All 15 Modules</h3>
            <p class="text-muted">Filter by date, category, or module type.</p>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 13. DEVICE MANAGER (PHASE 2 LIVE DATA & REVOCATION)
  devices: {
    render: () => {
      const devices = Auth.getRegisteredDevices();
      const currentDeviceId = Auth.deviceId;
      const securityEvents = Auth.getSecurityEvents();

      return `
        <div class="view-container">
          <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
            <div>
              <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Device Manager</h1>
              <p class="text-muted">Active sessions, device security, and remote session revocation.</p>
            </div>
            <button class="btn btn-danger" id="revoke-all-btn">
              Revoke All Other Devices
            </button>
          </div>

          <!-- Active Devices List -->
          <div class="card" style="margin-bottom: var(--space-6);">
            <div class="card-header">
              <h2 class="card-title">Registered & Active Devices</h2>
              <span class="badge badge-success">${devices.filter(d => !d.revoked).length} Active</span>
            </div>
            <div class="flex flex-col gap-3" id="devices-list-container">
              ${devices.length === 0 ? `
                <div class="text-xs text-muted" style="padding: 12px;">No active devices recorded.</div>
              ` : devices.map(d => {
                const isCurrent = d.deviceId === currentDeviceId;
                return `
                  <div class="card flex justify-between items-center" style="padding: 14px 18px; background: var(--bg-surface-hover); ${d.revoked ? 'opacity: 0.5;' : ''}">
                    <div class="flex items-center gap-3">
                      <div style="color: ${d.revoked ? 'var(--text-subtle)' : isCurrent ? 'var(--color-success)' : 'var(--accent-primary)'};">
                        ${Icons.devices}
                      </div>
                      <div>
                        <div class="text-sm font-semibold flex items-center gap-2">
                          <span>${d.deviceName || 'Device'}</span>
                          ${d.revoked ? `<span class="badge badge-danger">Revoked</span>` : ''}
                        </div>
                        <div class="text-xs text-muted">
                          ID: ${d.deviceId.substring(0, 14)}... • Last Active: ${new Date(d.lastActiveAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div>
                      ${isCurrent ? `
                        <span class="badge badge-success">This Device</span>
                      ` : d.revoked ? `
                        <span class="text-xs text-muted">Terminated</span>
                      ` : `
                        <button class="btn btn-danger btn-sm revoke-device-btn" data-device-id="${d.deviceId}">
                          Revoke
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Security Audit Events -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Security & Audit Event Log</h2>
              <span class="badge badge-violet">${securityEvents.length} Events</span>
            </div>
            <div class="flex flex-col gap-2" style="max-height: 320px; overflow-y: auto;">
              ${securityEvents.length === 0 ? `
                <div class="text-xs text-muted">No security events logged yet.</div>
              ` : securityEvents.map(evt => {
                const isCrit = evt.severity === 'CRITICAL';
                const isWarn = evt.severity === 'WARNING';
                const badgeClass = isCrit ? 'badge-danger' : isWarn ? 'badge-warning' : 'badge-champagne';
                return `
                  <div class="flex items-center justify-between" style="padding: 8px 12px; background: var(--bg-surface-hover); border-radius: var(--radius-sm); font-size: var(--text-xs);">
                    <div class="flex items-center gap-2">
                      <span class="badge ${badgeClass}">${evt.eventType}</span>
                      <span class="text-muted">${evt.details?.email || ''}</span>
                    </div>
                    <span class="text-subtle">${new Date(evt.timestamp).toLocaleString()}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    },
    mount: (container) => {
      const revokeAllBtn = container.querySelector('#revoke-all-btn');
      if (revokeAllBtn) {
        revokeAllBtn.addEventListener('click', () => {
          Modal.confirm({
            title: 'Revoke All Other Devices',
            message: 'Are you sure? All other active sessions on other phones and computers will be terminated immediately.',
            isDanger: true,
            confirmText: 'Revoke All',
            onConfirm: () => {
              Auth.revokeAllOtherDevices();
              AppRouter.handleRouting();
            }
          });
        });
      }

      container.querySelectorAll('.revoke-device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const devId = btn.getAttribute('data-device-id');
          Modal.confirm({
            title: 'Revoke Device',
            message: 'Are you sure you want to terminate this device session?',
            isDanger: true,
            confirmText: 'Revoke',
            onConfirm: () => {
              Auth.revokeDevice(devId);
              Toast.warning('Device Revoked', 'Session was permanently terminated.');
              AppRouter.handleRouting();
            }
          });
        });
      });
    }
  },

  // 14. RECOVERY CENTER
  recovery: {
    render: () => `
      <div class="view-container">
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">Disaster Prevention</div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Recovery Center</h1>
            <p class="text-muted">Emergency kits, key rotation, and encrypted backup restoration.</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6);">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Emergency Recovery Kit</h2>
              <span class="badge badge-champagne">Critical</span>
            </div>
            <p class="text-sm text-muted" style="margin-bottom: var(--space-4);">
              Download a 24-word cryptographic seed or encrypted JSON kit to restore vault keys in case all devices are lost.
            </p>
            <button class="btn btn-accent" onclick="window.Toast.info('Recovery Kit', 'Cryptographic export active in Phase 10.')">
              Download Emergency Kit
            </button>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Key Rotation</h2>
              <span class="badge badge-violet">Security</span>
            </div>
            <p class="text-sm text-muted" style="margin-bottom: var(--space-4);">
              Re-encrypt all shared secrets under a newly generated Master Vault Key without data loss.
            </p>
            <button class="btn btn-secondary" onclick="window.Toast.info('Key Rotation', 'Available in Phase 10.')">
              Rotate Vault Keys
            </button>
          </div>
        </div>
      </div>
    `,
    mount: () => {}
  },

  // 15. SETTINGS & PROFILE
  settings: {
    render: () => {
      const user = Auth.getCurrentUser() || {
        displayName: 'Authorized User',
        email: 'user1@gosh.internal',
        role: 'owner'
      };
      const initials = (user.displayName || 'G').substring(0, 2).toUpperCase();

      return `
        <div class="view-container">
          <div class="card" style="margin-bottom: var(--space-6);">
            <div class="card-header">
              <h1 class="card-title" style="font-size: var(--text-xl);">Settings & Preferences</h1>
              <span class="badge badge-violet">Profile</span>
            </div>
            <div class="flex items-center gap-4">
              <div class="user-avatar-badge" style="width: 56px; height: 56px; font-size: 1.25rem; background: var(--accent-primary-muted); border-color: var(--accent-primary); color: var(--accent-primary);">
                ${initials}
              </div>
              <div>
                <div class="text-md font-semibold">${user.displayName} (Authorized Identity)</div>
                <div class="text-xs text-muted">${user.email} • Role: ${user.role}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Security & Privacy</h2>
            </div>
            <div class="flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-sm font-semibold">Vault Auto-Lock Timeout</div>
                  <div class="text-xs text-muted">Automatically lock the encryption key after inactivity</div>
                </div>
                <select class="input-field" style="width: auto;">
                  <option value="1">1 Minute</option>
                  <option value="5" selected>5 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="0">Immediate on blur</option>
                </select>
              </div>

              <div class="flex justify-between items-center" style="padding-top: var(--space-3); border-top: 1px solid var(--border-subtle);">
                <div>
                  <div class="text-sm font-semibold">Application Theme</div>
                  <div class="text-xs text-muted">Graphite & Charcoal Dark Palette</div>
                </div>
                <span class="badge badge-champagne">Dark Mode Default</span>
              </div>

              <div class="flex justify-between items-center" style="padding-top: var(--space-3); border-top: 1px solid var(--border-subtle);">
                <div>
                  <div class="text-sm font-semibold">Sign Out Current Session</div>
                  <div class="text-xs text-muted">Clears local session tokens and locks vault</div>
                </div>
                <button class="btn btn-danger btn-sm" id="settings-logout-btn">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },
    mount: (container) => {
      const logoutBtn = container.querySelector('#settings-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          Modal.confirm({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out from this device?',
            confirmText: 'Sign Out',
            onConfirm: () => {
              Auth.logout();
            }
          });
        });
      }
    }
  }
};
