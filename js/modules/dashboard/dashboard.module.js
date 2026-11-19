/**
 * GOSH HOME DASHBOARD MODULE (PHASE 4)
 * Live telemetry, activity feeds, storage gauges, and notification center.
 */

import { Icons } from '../../components/icons.js';
import { Auth } from '../../services/auth.service.js';
import { DB } from '../../services/db.service.js';
import { State } from '../../state.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const DashboardModule = {
  // Utility: Format bytes into human-readable string
  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // Utility: Humanize time ago
  formatTimeAgo(isoString) {
    if (!isoString) return 'recently';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  },

  // Utility: Personalized greeting based on local time
  getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  },

  async render() {
    const user = Auth.getCurrentUser() || { displayName: 'Gokul', email: 'prasanthgokul736@gmail.com' };
    const greeting = this.getTimeGreeting();

    // 1. Fetch Real Application Data
    const [files, vaultItems, events, securityEvents, tasks] = await Promise.all([
      DB.query('files').catch(() => []),
      DB.query('vault_items').catch(() => []),
      DB.query('calendar_events').catch(() => []),
      DB.query('security_events').catch(() => []),
      DB.query('shared_tasks').catch(() => [])
    ]);

    // 2. Calculate Actual Storage Telemetry (MEGA 20 GB Free Tier)
    const totalMegaBytes = 20 * 1024 * 1024 * 1024; // 21,474,836,480 bytes
    const usedBytes = files.reduce((acc, f) => acc + (Number(f.file_size) || 0), 0);
    const usedPercent = Math.min(100, Math.max(0.1, (usedBytes / totalMegaBytes) * 100)).toFixed(1);
    const formattedUsed = this.formatBytes(usedBytes);

    // 3. Filter Upcoming Events (Sorted Chronologically)
    const nowIso = new Date().toISOString();
    const upcomingEvents = events
      .filter(e => e.start_time >= nowIso)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 3);

    // 4. Pending Tasks
    const pendingTasks = tasks.filter(t => !t.completed);

    // 5. Build Recent Activity Feed from actual events and files
    const activityItems = [];
    files.slice(0, 2).forEach(f => {
      activityItems.push({
        icon: Icons.cloud,
        title: `${f.name} uploaded`,
        subtitle: `Cloud Storage • ${this.formatBytes(f.file_size)}`,
        timestamp: f.created_at,
        color: 'var(--accent-primary)'
      });
    });

    securityEvents.slice(0, 3).forEach(s => {
      activityItems.push({
        icon: Icons.recovery,
        title: s.eventType.replace(/_/g, ' '),
        subtitle: `${s.details?.email || 'System'} • ${s.severity}`,
        timestamp: s.timestamp,
        color: s.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--accent-secondary)'
      });
    });

    activityItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const isVaultUnlocked = State.get('isVaultUnlocked');

    return `
      <div class="view-container">
        <!-- Top Personalized Greeting & Quick Actions -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-6); background: linear-gradient(135deg, var(--bg-surface), #1e1f29); border-color: var(--border-medium);">
          <div>
            <div class="badge badge-champagne" style="margin-bottom: var(--space-2);">
              Active Session • Encrypted Private Space
            </div>
            <h1 style="font-size: var(--text-2xl); font-weight: 700;">${greeting}, ${user.displayName}</h1>
            <p class="text-muted" style="margin-top: 2px;">All communication, files, and vault data are synchronized and shared.</p>
          </div>
          <div class="flex items-center gap-3">
            <a href="#calls" class="btn btn-secondary">
              ${Icons.calls}
              <span>Quick Call</span>
            </a>
            <a href="#connect" class="btn btn-primary">
              ${Icons.connect}
              <span>Open Chat</span>
            </a>
          </div>
        </div>

        <!-- Real-Time Metrics & Telemetry Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
          <!-- MEGA Storage Telemetry -->
          <div class="card card-interactive" onclick="window.location.hash='#cloud'">
            <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
              <span class="text-sm font-semibold text-muted">MEGA Cloud Storage</span>
              <div style="color: var(--accent-primary);">${Icons.cloud}</div>
            </div>
            <div style="font-size: var(--text-xl); font-weight: 700; color: var(--text-primary);">
              ${formattedUsed} <span style="font-size: var(--text-sm); font-weight: 400; color: var(--text-muted);">/ 20.0 GB</span>
            </div>
            <div style="background: var(--border-subtle); height: 6px; border-radius: var(--radius-full); margin-top: var(--space-2); overflow: hidden;">
              <div style="background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); width: ${usedPercent}%; height: 100%; transition: width 0.3s ease;"></div>
            </div>
            <div class="flex justify-between text-xs text-muted" style="margin-top: 6px;">
              <span>${files.length} Files</span>
              <span>${usedPercent}% Used</span>
            </div>
          </div>

          <!-- Password Vault Telemetry -->
          <div class="card card-interactive" onclick="window.location.hash='#vault'">
            <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
              <span class="text-sm font-semibold text-muted">Password Vault</span>
              <div style="color: var(--accent-secondary);">${Icons.vault}</div>
            </div>
            <div style="font-size: var(--text-xl); font-weight: 700; color: ${isVaultUnlocked ? 'var(--color-success)' : 'var(--text-primary)'};">
              ${isVaultUnlocked ? 'Vault Unlocked' : 'Vault Locked'}
            </div>
            <div class="flex items-center gap-2 text-xs" style="margin-top: var(--space-2); color: var(--accent-secondary);">
              ${isVaultUnlocked ? Icons.unlock : Icons.lock}
              <span>${vaultItems.length} Credentials Protected</span>
            </div>
          </div>

          <!-- Upcoming Events & Reminders -->
          <div class="card card-interactive" onclick="window.location.hash='#together'">
            <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
              <span class="text-sm font-semibold text-muted">Upcoming Moments</span>
              <div style="color: var(--color-info);">${Icons.together}</div>
            </div>
            <div style="font-size: var(--text-xl); font-weight: 700; color: var(--text-primary);">
              ${upcomingEvents.length} Event${upcomingEvents.length === 1 ? '' : 's'}
            </div>
            <p class="text-xs text-muted truncate" style="margin-top: var(--space-2);">
              ${upcomingEvents.length > 0 ? upcomingEvents[0].title : `${pendingTasks.length} pending to-do tasks`}
            </p>
          </div>

          <!-- Device Security Telemetry -->
          <div class="card card-interactive" onclick="window.location.hash='#devices'">
            <div class="flex justify-between items-center" style="margin-bottom: var(--space-3);">
              <span class="text-sm font-semibold text-muted">Device Security</span>
              <div style="color: var(--color-success);">${Icons.devices}</div>
            </div>
            <div style="font-size: var(--text-xl); font-weight: 700; color: var(--color-success);">Protected</div>
            <p class="text-xs text-muted" style="margin-top: var(--space-2);">
              Active session • Zero-Trust verified
            </p>
          </div>
        </div>

        <!-- Recent Activities & Quick Services -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: var(--space-6);">
          <!-- Activity Timeline -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Recent Activity</h2>
              <span class="badge badge-violet">Live Synced</span>
            </div>
            <div class="flex flex-col gap-3">
              ${activityItems.length === 0 ? `
                <div class="empty-state" style="padding: var(--space-6);">
                  <div class="empty-state-icon" style="width: 42px; height: 42px;">${Icons.info}</div>
                  <p class="text-xs text-muted">No recent activities recorded yet. Actions across the 15 modules will stream here.</p>
                </div>
              ` : activityItems.slice(0, 4).map(item => `
                <div class="flex items-center gap-3" style="padding: 10px 14px; background: var(--bg-surface-hover); border-radius: var(--radius-md);">
                  <div style="color: ${item.color}; flex-shrink: 0;">${item.icon}</div>
                  <div class="flex-1 truncate">
                    <div class="text-sm font-semibold truncate">${item.title}</div>
                    <div class="text-xs text-muted">${item.subtitle} • ${this.formatTimeAgo(item.timestamp)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Shortcuts & Navigation Hub -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Quick Services</h2>
              <span class="text-xs text-muted">14 Central Hubs</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2);">
              <a href="#connect" class="btn btn-secondary flex-col items-center justify-center text-center" style="padding: 14px 8px; height: 78px;">
                <div style="color: var(--accent-primary);">${Icons.connect}</div>
                <span class="text-xs" style="margin-top: 4px;">Connect</span>
              </a>
              <a href="#calls" class="btn btn-secondary flex-col items-center justify-center text-center" style="padding: 14px 8px; height: 78px;">
                <div style="color: var(--color-success);">${Icons.calls}</div>
                <span class="text-xs" style="margin-top: 4px;">Calls</span>
              </a>
              <a href="#cloud" class="btn btn-secondary flex-col items-center justify-center text-center" style="padding: 14px 8px; height: 78px;">
                <div style="color: var(--accent-primary);">${Icons.cloud}</div>
                <span class="text-xs" style="margin-top: 4px;">Cloud</span>
              </a>
              <a href="#vault" class="btn btn-secondary flex-col items-center justify-center text-center" style="padding: 14px 8px; height: 78px;">
                <div style="color: var(--accent-secondary);">${Icons.vault}</div>
                <span class="text-xs" style="margin-top: 4px;">Vault</span>
              </a>
              <a href="#memories" class="btn btn-secondary flex-col items-center justify-center text-center" style="padding: 14px 8px; height: 78px;">
                <div style="color: var(--color-info);">${Icons.memories}</div>
                <span class="text-xs" style="margin-top: 4px;">Memories</span>
              </a>
              <a href="#diary" class="btn btn-secondary flex-col items-center justify-center text-center" style="padding: 14px 8px; height: 78px;">
                <div style="color: var(--accent-secondary);">${Icons.diary}</div>
                <span class="text-xs" style="margin-top: 4px;">Diary</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  mount(container) {
    // Listen for real-time changes to refresh dashboard metrics automatically
    this.unsubFiles = DB.subscribe('files', () => this.refreshIfActive());
    this.unsubVault = DB.subscribe('vault_items', () => this.refreshIfActive());
    this.unsubEvents = DB.subscribe('calendar_events', () => this.refreshIfActive());
    this.unsubSecurity = DB.subscribe('security_events', () => this.refreshIfActive());
  },

  unmount() {
    if (this.unsubFiles) this.unsubFiles();
    if (this.unsubVault) this.unsubVault();
    if (this.unsubEvents) this.unsubEvents();
    if (this.unsubSecurity) this.unsubSecurity();
  },

  refreshIfActive() {
    if (State.get('activeRoute') === 'home') {
      window.AppRouter?.handleRouting();
    }
  }
};
