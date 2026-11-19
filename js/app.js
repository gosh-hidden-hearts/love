/**
 * GOSH APPLICATION BOOTSTRAPPER (PHASE 1)
 * Initializes router, state, component handlers, and view bindings.
 */

import { State } from './state.js';
import { AppRouter } from './router.js';
import { Views } from './modules/views.js';
import { Toast } from './components/toast.js';
import { Modal } from './components/modal.js';
import { Icons } from './components/icons.js';
import { Auth } from './services/auth.service.js';
import { DB } from './services/db.service.js';

// Expose core component APIs globally for inline action triggers
window.Toast = Toast;
window.Modal = Modal;
window.GOSHState = State;
window.Auth = Auth;
window.DB = DB;

class App {
  constructor() {
    this.sidebar = null;
    this.backdrop = null;
  }

  init() {
    console.log('[GOSH] Initializing Private Ecosystem Shell...');

    // 1. Register all 15 views with the SPA router
    Object.keys(Views).forEach(routeName => {
      AppRouter.register(routeName, Views[routeName]);
    });

    // 2. Initialize router on DOM container
    AppRouter.init('main-view-container');

    // 3. Setup Shell UI Interactivity
    this.setupShellControls();

    // 4. Bind State to Header Indicators
    this.setupStateBindings();

    console.log('[GOSH] Ecosystem Ready. Active Route:', AppRouter.getCurrentRoute());
  }

  setupShellControls() {
    this.sidebar = document.getElementById('app-sidebar');
    this.backdrop = document.getElementById('sidebar-backdrop');
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const moreBtn = document.getElementById('mobile-more-btn');
    const vaultBtn = document.getElementById('header-vault-btn');
    const notifBtn = document.getElementById('header-notif-btn');

    // Mobile drawer toggle
    const toggleDrawer = () => {
      if (!this.sidebar) return;
      const isOpen = this.sidebar.classList.toggle('drawer-open');
      if (this.backdrop) {
        this.backdrop.classList.toggle('open', isOpen);
      }
    };

    const closeDrawer = () => {
      if (this.sidebar) this.sidebar.classList.remove('drawer-open');
      if (this.backdrop) this.backdrop.classList.remove('open');
    };

    if (menuToggle) menuToggle.addEventListener('click', toggleDrawer);
    if (moreBtn) moreBtn.addEventListener('click', toggleDrawer);
    if (this.backdrop) this.backdrop.addEventListener('click', closeDrawer);

    // Close drawer when navigating
    document.querySelectorAll('.app-sidebar .nav-item').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    // Vault lock toggle button in header
    if (vaultBtn) {
      vaultBtn.addEventListener('click', () => {
        const isLocked = State.get('isVaultUnlocked');
        if (isLocked) {
          State.set('isVaultUnlocked', false);
          Toast.warning('Vault Locked', 'Master encryption keys purged from memory.');
        } else {
          Modal.confirm({
            title: 'Unlock GOSH Vault',
            message: 'In Phase 7, you will enter your master passphrase here to derive AES-256-GCM keys. Simulate unlocking now?',
            confirmText: 'Unlock',
            onConfirm: () => {
              State.set('isVaultUnlocked', true);
              Toast.success('Vault Unlocked', 'Session active with AES-256-GCM key derived in memory.');
            }
          });
        }
      });
    }

    // Notification center button
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        Modal.open({
          title: 'Notification Center',
          content: `
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-3" style="padding: 10px; background: var(--bg-surface-hover); border-radius: var(--radius-md);">
                <div style="color: var(--color-success);">${Icons.devices}</div>
                <div>
                  <div class="text-sm font-semibold">Device Paired</div>
                  <div class="text-xs text-muted">User 2 authorized device active • 12m ago</div>
                </div>
              </div>
              <div class="flex items-center gap-3" style="padding: 10px; background: var(--bg-surface-hover); border-radius: var(--radius-md);">
                <div style="color: var(--accent-primary);">${Icons.cloud}</div>
                <div>
                  <div class="text-sm font-semibold">Storage Health Check</div>
                  <div class="text-xs text-muted">MEGA 20 GB free tier verified active • 1h ago</div>
                </div>
              </div>
            </div>
          `
        });
      });
    }
  }

  setupStateBindings() {
    // React to vault lock/unlock changes
    State.subscribe('isVaultUnlocked', (unlocked) => {
      const vaultBtn = document.getElementById('header-vault-btn');
      if (vaultBtn) {
        if (unlocked) {
          vaultBtn.innerHTML = `
            ${Icons.unlock}
            <span>Vault Unlocked</span>
          `;
          vaultBtn.style.color = 'var(--color-success)';
          vaultBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
          vaultBtn.innerHTML = `
            ${Icons.lock}
            <span>Vault Locked</span>
          `;
          vaultBtn.style.color = 'var(--accent-secondary)';
          vaultBtn.style.borderColor = 'var(--border-subtle)';
        }
      }
    });

    // React to user auth state changes
    State.subscribe('user', (user) => {
      const avatarEl = document.getElementById('header-avatar');
      const appSidebar = document.getElementById('app-sidebar');
      const bottomNav = document.getElementById('mobile-bottom-nav');
      const vaultBtn = document.getElementById('header-vault-btn');
      const notifBtn = document.getElementById('header-notif-btn');

      if (user) {
        if (avatarEl) {
          const initials = (user.displayName || 'G').substring(0, 2).toUpperCase();
          avatarEl.textContent = initials;
          avatarEl.title = `${user.displayName} (${user.email})`;
          avatarEl.style.display = 'flex';
        }
        if (appSidebar) appSidebar.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = '';
        if (vaultBtn) vaultBtn.style.display = 'inline-flex';
        if (notifBtn) notifBtn.style.display = 'inline-flex';
      } else {
        if (avatarEl) avatarEl.style.display = 'none';
        if (appSidebar) appSidebar.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        if (vaultBtn) vaultBtn.style.display = 'none';
        if (notifBtn) notifBtn.style.display = 'none';
      }
    });

    // React to network online/offline changes
    State.subscribe('onlineStatus', (isOnline) => {
      const indicator = document.getElementById('security-indicator');
      if (indicator) {
        if (isOnline) {
          indicator.innerHTML = `
            <span class="status-dot"></span>
            <span>Encrypted Channel</span>
          `;
          indicator.style.color = 'var(--color-success)';
          indicator.style.background = 'rgba(16, 185, 129, 0.1)';
        } else {
          indicator.innerHTML = `
            <span class="status-dot" style="background-color: var(--color-danger); box-shadow: 0 0 8px var(--color-danger);"></span>
            <span>Offline</span>
          `;
          indicator.style.color = 'var(--color-danger)';
          indicator.style.background = 'rgba(239, 68, 68, 0.1)';
          Toast.warning('Connection Lost', 'You are currently offline. Local caches active.');
        }
      }
    });
  }
}

// Start application when DOM is parsed
document.addEventListener('DOMContentLoaded', () => {
  const goshApp = new App();
  goshApp.init();
});
