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
import { CloudModule } from './cloud/cloud.module.js';
import { VaultModule } from './vault/vault.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { CallsModule } from './calls/calls.module.js';

export const Views = {
  // 01. AUTHENTICATION VIEW (PHASE 2 MULTI-STEP FLOW)
  auth: AuthView,

  // 02. HOME DASHBOARD (PHASE 4 LIVE TELEMETRY & FEEDS)
  home: DashboardModule,

  // 03. CONNECT (PHASE 5 LIVE E2EE CHAT, MEDIA & REACTIONS)
  connect: ConnectModule,

  // 04. CALLS (PHASE 8 WEBRTC DIRECT P2P CALLING & SCREEN SHARING)
  calls: CallsModule,

  // 05. VAULT (PHASE 7 ZERO-KNOWLEDGE PASSWORD MANAGER)
  vault: VaultModule,

  // 06. CLOUD (PHASE 6 MEGA CLOUD STORAGE)
  cloud: CloudModule,

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

  // 11. DOCUMENT LOCKER (PHASE 7 CONFIDENTIAL CERTIFICATES & DOCS)
  documents: DocumentsModule,

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
