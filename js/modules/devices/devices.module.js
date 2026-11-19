/**
 * GOSH DEVICE MANAGER MODULE (PHASE 10)
 * Hardware Device Identification, Registered Sessions, Security Audit Trail, and Remote Revocation.
 */

import { Icons } from '../../components/icons.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const DevicesModule = {
  render() {
    const devices = Auth.getRegisteredDevices();
    const currentDeviceId = Auth.deviceId;
    const securityEvents = Auth.getSecurityEvents();

    return `
      <div class="view-container">
        <!-- Top Title Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">
              Hardware Trust & Device Management
            </div>
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

        <!-- Security Events Audit Trail -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Security & Session Audit Trail</h2>
            <span class="text-xs text-muted">Immutable Ledger</span>
          </div>
          <div class="flex flex-col gap-2" id="security-events-container">
            ${securityEvents.length === 0 ? `
              <div class="text-xs text-muted" style="padding: 12px;">No security events recorded.</div>
            ` : securityEvents.slice(0, 15).map(evt => {
              const badgeClass = evt.severity === 'CRITICAL' ? 'badge-danger' : evt.severity === 'WARNING' ? 'badge-champagne' : 'badge-violet';
              return `
                <div class="flex justify-between items-center" style="padding: 8px 12px; background: var(--bg-surface-hover); border-radius: var(--radius-sm); font-size: 11px;">
                  <div class="flex items-center gap-2">
                    <span class="badge ${badgeClass}">${evt.eventType}</span>
                    <span class="text-muted">${evt.details?.email || evt.details?.reason || ''}</span>
                  </div>
                  <span class="text-subtle font-mono">${new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  mount() {
    const revokeAllBtn = document.getElementById('revoke-all-btn');
    if (revokeAllBtn) {
      revokeAllBtn.addEventListener('click', () => {
        Modal.confirm(
          'Revoke All Other Devices',
          'Are you sure? All other active sessions on other phones and computers will be terminated immediately.',
          () => {
            Auth.revokeAllOtherDevices();
            this.refreshView();
          }
        );
      });
    }

    document.querySelectorAll('.revoke-device-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const devId = e.currentTarget.dataset.deviceId;
        Modal.confirm(
          'Revoke Device Session',
          'Are you sure you want to terminate this device session?',
          () => {
            Auth.revokeDevice(devId);
            Toast.warning('Device Revoked', 'Session was permanently terminated.');
            this.refreshView();
          }
        );
      });
    });
  },

  refreshView() {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    if (main && window.location.hash === '#devices') {
      main.innerHTML = this.render();
      this.mount();
    }
  }
};
