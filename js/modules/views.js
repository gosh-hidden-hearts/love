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
import { MemoriesModule } from './memories/memories.module.js';
import { DiaryModule } from './diary/diary.module.js';
import { TogetherModule } from './together/together.module.js';
import { MusicModule } from './music/music.module.js';
import { SearchModule } from './search/search.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { RecoveryModule } from './recovery/recovery.module.js';

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

  // 07. MEMORIES (PHASE 9 SHARED PHOTO ALBUMS & MILESTONES)
  memories: MemoriesModule,

  // 08. DIARY (PHASE 9 ENCRYPTED SHARED JOURNAL & MOOD TAGS)
  diary: DiaryModule,

  // 09. TOGETHER (PHASE 9 CALENDAR, TASKS & SHARED EXPENSES)
  together: TogetherModule,

  // 10. MUSIC (PHASE 9 SHARED PLAYLISTS & STREAMING LINKS)
  music: MusicModule,

  // 11. DOCUMENT LOCKER (PHASE 7 CONFIDENTIAL CERTIFICATES & DOCS)
  documents: DocumentsModule,

  // 12. SMART SEARCH (PHASE 9 UNIFIED INDEX ACROSS ALL MODULES)
  search: SearchModule,

  // 13. DEVICE MANAGER (PHASE 10 HARDWARE TRUST & REMOTE REVOCATION)
  devices: DevicesModule,

  // 14. RECOVERY CENTER (PHASE 10 EMERGENCY KITS & MASTER KEY ROTATION)
  recovery: RecoveryModule,

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
      const root = container || document;
      const logoutBtn = root.querySelector('#settings-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          Modal.confirm(
            'Sign Out',
            'Are you sure you want to sign out from this device?',
            () => {
              Auth.logout();
              window.location.hash = '#auth';
            }
          );
        });
      }
    }
  }
};
