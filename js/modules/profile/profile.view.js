/**
 * GOSH DEDICATED PROFILE AND BIOGRAPHY MANAGEMENT VIEW (PHASE 9)
 * Mobile-First Love-Themed User Experience
 */

import { Icons } from '../../components/icons.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';
import { State } from '../../state.js';
import { AppRouter } from '../../router.js';

export const ProfileView = {
  render: () => {
    const user = Auth.getCurrentUser() || {
      id: 'guest',
      displayName: 'GOSH User',
      fullName: 'GOSH User',
      username: 'user',
      email: 'user@example.com',
      phone: '+1 555-0100',
      bio: 'Living life, telling stories.',
      avatar: '',
      role: 'user'
    };

    const allUsers = Auth.getAllUsers ? Auth.getAllUsers() : [];
    const fullProfile = allUsers.find(u => u.id === user.id) || user;

    const displayName = fullProfile.fullName || fullProfile.displayName || 'GOSH Member';
    const username = fullProfile.username ? `@${fullProfile.username.replace(/^@/, '')}` : '@user';
    const email = fullProfile.email || 'user@example.com';
    const phone = fullProfile.phone || '+1 555-0100';
    const bio = fullProfile.bio || 'Living life, telling stories.';
    const initials = displayName.substring(0, 2).toUpperCase();

    // Stored privacy settings
    const privacy = JSON.parse(localStorage.getItem('gosh_privacy_settings') || '{"phoneDiscovery":true,"onlineStatus":true,"lastSeen":true}');

    return `
      <div class="view-container profile-page" style="padding-bottom: var(--space-8);">
        <!-- Profile Hero Header -->
        <div class="card text-center" style="margin-bottom: var(--space-4); background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(139, 38, 75, 0.12) 100%); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: var(--space-6) var(--space-4);">
          
          <div class="profile-avatar-container" style="position: relative; width: 88px; height: 88px; margin: 0 auto var(--space-3);">
            <div class="love-glow" style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; border: 2.5px solid var(--rose-400); box-shadow: 0 4px 20px rgba(139, 38, 75, 0.45);">
              ${initials}
            </div>
            <button id="quick-avatar-btn" title="Change Avatar" style="position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; border-radius: 50%; background: var(--wine-600); border: 2px solid var(--bg-surface); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>

          <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--ivory-50); margin: 0;">${displayName}</h2>
          <div style="font-size: 0.88rem; color: var(--champagne-300); font-weight: 500; margin-top: 2px;">${username}</div>
          
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin: var(--space-3) auto 0; max-width: 340px; line-height: 1.45; font-style: italic;">
            "${bio}"
          </p>

          <div class="flex justify-center gap-2" style="margin-top: var(--space-4);">
            <button id="edit-profile-btn" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, var(--wine-600), var(--wine-500)); border: 1px solid var(--rose-400); padding: 8px 18px; font-weight: 600;">
              Edit Profile
            </button>
            <a href="#cloud" class="btn btn-secondary btn-sm" style="border: 1px solid var(--border-subtle); padding: 8px 14px;">
              Memory Wallet
            </a>
          </div>
        </div>

        <!-- Account Verification & Identity -->
        <div class="card" style="margin-bottom: var(--space-4); border: 1px solid var(--border-subtle);">
          <div class="card-header" style="padding-bottom: var(--space-2); margin-bottom: var(--space-3); border-bottom: 1px solid var(--border-subtle);">
            <h3 class="card-title" style="font-size: 0.95rem; color: var(--rose-200); font-weight: 600;">Account Credentials & Verification</h3>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex justify-between items-center" style="padding: 6px 0;">
              <div>
                <div class="text-xs text-muted">Email Address</div>
                <div class="text-sm font-medium" style="color: var(--text-primary);">${email}</div>
              </div>
              <span class="badge badge-success flex items-center gap-1" style="font-size: 0.72rem; padding: 2px 8px;">
                <span class="status-dot"></span> Verified
              </span>
            </div>

            <div class="flex justify-between items-center" style="padding: 6px 0; border-top: 1px solid var(--border-subtle);">
              <div>
                <div class="text-xs text-muted">Mobile Phone</div>
                <div class="text-sm font-medium" style="color: var(--text-primary);">${phone}</div>
              </div>
              <span class="badge badge-success flex items-center gap-1" style="font-size: 0.72rem; padding: 2px 8px;">
                <span class="status-dot"></span> Verified
              </span>
            </div>

            <div class="flex justify-between items-center" style="padding: 6px 0; border-top: 1px solid var(--border-subtle);">
              <div>
                <div class="text-xs text-muted">Session Identity</div>
                <div class="text-sm font-medium" style="color: var(--text-primary);">Role: ${fullProfile.role || 'user'} • Device Trust: Active</div>
              </div>
              <span class="badge badge-champagne" style="font-size: 0.72rem;">Encrypted</span>
            </div>
          </div>
        </div>

        <!-- Privacy & Social Discovery Controls -->
        <div class="card" style="margin-bottom: var(--space-4); border: 1px solid var(--border-subtle);">
          <div class="card-header" style="padding-bottom: var(--space-2); margin-bottom: var(--space-3); border-bottom: 1px solid var(--border-subtle);">
            <h3 class="card-title" style="font-size: 0.95rem; color: var(--rose-200); font-weight: 600;">Privacy & Discovery Settings</h3>
          </div>

          <div class="flex flex-col gap-3">
            <label class="flex justify-between items-center" style="cursor: pointer;">
              <div>
                <div class="text-sm font-medium" style="color: var(--text-primary);">Discoverable by Mobile Number</div>
                <div class="text-xs text-muted">Allow friends to discover your profile using phone number</div>
              </div>
              <input type="checkbox" id="priv-phone-toggle" ${privacy.phoneDiscovery ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-primary);" />
            </label>

            <label class="flex justify-between items-center" style="cursor: pointer; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
              <div>
                <div class="text-sm font-medium" style="color: var(--text-primary);">Display Online Status</div>
                <div class="text-xs text-muted">Show green indicator when you are actively connected</div>
              </div>
              <input type="checkbox" id="priv-online-toggle" ${privacy.onlineStatus ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-primary);" />
            </label>

            <label class="flex justify-between items-center" style="cursor: pointer; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
              <div>
                <div class="text-sm font-medium" style="color: var(--text-primary);">Last Seen Visibility</div>
                <div class="text-xs text-muted">Allow contacts to see your last active timestamp</div>
              </div>
              <input type="checkbox" id="priv-lastseen-toggle" ${privacy.lastSeen ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-primary);" />
            </label>
          </div>
        </div>

        <!-- Account Security & Sign Out Actions -->
        <div class="card" style="border: 1px solid var(--border-subtle);">
          <div class="flex flex-col gap-2">
            <a href="#devices" class="btn btn-secondary w-full justify-between" style="text-decoration: none;">
              <span>Registered Devices & Active Sessions</span>
              <span>→</span>
            </a>
            <a href="#recovery" class="btn btn-secondary w-full justify-between" style="text-decoration: none;">
              <span>Emergency Recovery Center</span>
              <span>→</span>
            </a>
            <button id="profile-signout-btn" class="btn btn-ghost w-full" style="color: var(--color-danger); margin-top: var(--space-2); border: 1px solid rgba(239, 68, 68, 0.3);">
              Sign Out from Device
            </button>
          </div>
        </div>

      </div>
    `;
  },

  mount: (container) => {
    const editBtn = container.querySelector('#edit-profile-btn');
    const avatarBtn = container.querySelector('#quick-avatar-btn');
    const signoutBtn = container.querySelector('#profile-signout-btn');
    const phoneToggle = container.querySelector('#priv-phone-toggle');
    const onlineToggle = container.querySelector('#priv-online-toggle');
    const lastseenToggle = container.querySelector('#priv-lastseen-toggle');

    // Save privacy setting changes
    const savePrivacy = () => {
      const settings = {
        phoneDiscovery: phoneToggle.checked,
        onlineStatus: onlineToggle.checked,
        lastSeen: lastseenToggle.checked
      };
      localStorage.setItem('gosh_privacy_settings', JSON.stringify(settings));
      Toast.success('Privacy Updated', 'Your discovery preferences have been saved.');
    };

    if (phoneToggle) phoneToggle.addEventListener('change', savePrivacy);
    if (onlineToggle) onlineToggle.addEventListener('change', savePrivacy);
    if (lastseenToggle) lastseenToggle.addEventListener('change', savePrivacy);

    // Sign Out Handler
    if (signoutBtn) {
      signoutBtn.addEventListener('click', () => {
        Modal.confirm({
          title: 'Sign Out',
          message: 'Are you sure you want to end your active session on this device?',
          confirmText: 'Sign Out',
          confirmVariant: 'danger',
          onConfirm: () => {
            Auth.logout();
          }
        });
      });
    }

    // Edit Profile Modal
    const openEditModal = () => {
      const curUser = Auth.getCurrentUser() || {};
      const allUsers = Auth.getAllUsers ? Auth.getAllUsers() : [];
      const user = allUsers.find(u => u.id === curUser.id) || curUser;

      Modal.open({
        title: 'Edit Profile & Biography',
        content: `
          <div class="flex flex-col gap-3">
            <div class="form-group">
              <label class="form-label" for="edit-modal-name">Full Name</label>
              <input type="text" id="edit-modal-name" class="input-field" value="${user.fullName || user.displayName || ''}" placeholder="Full Name" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="edit-modal-username">Username</label>
              <div style="position: relative;">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--rose-400); font-weight: 600;">@</span>
                <input type="text" id="edit-modal-username" class="input-field" style="padding-left: 26px;" value="${user.username ? user.username.replace(/^@/, '') : ''}" placeholder="username" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="edit-modal-bio">Short Bio</label>
              <textarea id="edit-modal-bio" class="input-field" rows="3" placeholder="Tell your story..." maxlength="180">${user.bio || ''}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="edit-modal-phone">Mobile Phone</label>
              <input type="tel" id="edit-modal-phone" class="input-field" value="${user.phone || ''}" placeholder="+1 555-0123" />
            </div>

            <div class="form-group">
              <label class="form-label" for="edit-modal-pass">Change Password (leave blank to keep current)</label>
              <input type="password" id="edit-modal-pass" class="input-field" placeholder="New password (min 8 chars)" minlength="8" />
            </div>
          </div>
        `,
        footer: `
          <div class="flex gap-2">
            <button class="btn btn-secondary" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Cancel</button>
            <button class="btn btn-primary" id="save-edit-profile-btn">Save Changes</button>
          </div>
        `,
        onOpen: (modalEl) => {
          const saveBtn = modalEl.querySelector('#save-edit-profile-btn');
          const nameInput = modalEl.querySelector('#edit-modal-name');
          const userInput = modalEl.querySelector('#edit-modal-username');
          const bioInput = modalEl.querySelector('#edit-modal-bio');
          const phoneInput = modalEl.querySelector('#edit-modal-phone');
          const passInput = modalEl.querySelector('#edit-modal-pass');

          saveBtn.addEventListener('click', async () => {
            try {
              saveBtn.disabled = true;
              saveBtn.textContent = 'Saving...';

              const updates = {
                fullName: nameInput.value.trim(),
                username: userInput.value.trim(),
                bio: bioInput.value.trim(),
                phone: phoneInput.value.trim()
              };

              if (passInput.value.trim()) {
                updates.password = passInput.value.trim();
              }

              await Auth.updateProfile(user.id, updates);
              Modal.close(modalEl.closest('.modal-backdrop'));
              AppRouter.renderView('profile');
            } catch (err) {
              Toast.error('Update Failed', err.message);
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save Changes';
            }
          });
        }
      });
    };

    if (editBtn) editBtn.addEventListener('click', openEditModal);
    if (avatarBtn) avatarBtn.addEventListener('click', openEditModal);
  }
};
