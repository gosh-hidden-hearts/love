/**
 * GOSH CALLS MODULE (PHASE 8)
 * Direct P2P WebRTC Video, Voice Calling, Screen Sharing & Call History.
 */

import { Icons } from '../../components/icons.js';
import { WebRTC } from '../../services/webrtc.service.js';
import { DB } from '../../services/db.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export const CallsModule = {
  async render() {
    const history = await DB.query('call_history', null, (a, b) => new Date(b.created_at) - new Date(a.created_at)).catch(() => []);
    const isCallActive = WebRTC.callActive;

    if (isCallActive) {
      return this.renderActiveCallStage();
    }

    return `
      <div class="view-container">
        <!-- Top Action & Lobby Header -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4);">
          <div>
            <div class="badge badge-violet" style="margin-bottom: var(--space-2);">
              WebRTC Direct P2P Calling
            </div>
            <h1 class="card-title" style="font-size: var(--text-xl);">GOSH Calls</h1>
            <p class="text-muted">Encrypted audio, HD video, and bidirectional screen sharing.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary" id="start-voice-call-btn">
              ${Icons.calls}
              <span>Voice Call</span>
            </button>
            <button class="btn btn-primary" id="start-video-call-btn">
              ${Icons.calls}
              <span>Video Call</span>
            </button>
          </div>
        </div>

        <!-- Video Call Lobby Stage -->
        <div class="card" style="aspect-ratio: 16/9; max-height: 480px; background: #0c0d12; border: 1px solid var(--border-medium); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; margin-bottom: var(--space-6); overflow: hidden; border-radius: var(--radius-xl);">
          <div class="text-center" style="z-index: 1;">
            <div class="brand-emblem" style="width: 64px; height: 64px; margin: 0 auto var(--space-4); font-size: 1.8rem;">G</div>
            <h3 style="font-size: var(--text-lg); font-weight: 600; color: var(--text-primary);">P2P Channel Standing By</h3>
            <p class="text-muted" style="margin-top: 4px; font-size: var(--text-sm);">
              Google Public STUN discovery active • SRTP Media Encryption
            </p>
            <div class="flex items-center justify-center gap-2" style="margin-top: var(--space-4);">
              <span class="status-dot"></span>
              <span class="text-xs text-muted">Ready to connect with partner</span>
            </div>
          </div>
        </div>

        <!-- Call History -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title text-sm">Call History (${history.length})</h2>
            <span class="badge badge-champagne text-xs">P2P Encrypted Logs</span>
          </div>

          ${history.length === 0 ? `
            <div class="empty-state" style="padding: 40px var(--space-4);">
              <div class="empty-state-icon">${Icons.calls}</div>
              <h4 class="card-title text-sm">No Calls Recorded Yet</h4>
              <p class="text-xs text-muted" style="margin-top: 4px;">Start a voice or video call with your partner to log sessions here.</p>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              ${history.map(call => {
                const isVideo = call.call_type === 'video';
                const statusColor = call.status === 'completed' ? 'badge-success' : 'badge-danger';
                return `
                  <div class="card flex justify-between items-center" style="padding: 12px 16px; background: var(--bg-surface-hover);">
                    <div class="flex items-center gap-3">
                      <div style="color: ${isVideo ? 'var(--accent-primary)' : 'var(--color-success)'};">
                        ${Icons.calls}
                      </div>
                      <div>
                        <div class="text-sm font-semibold flex items-center gap-2">
                          <span style="text-transform: capitalize;">${call.call_type} Call</span>
                          <span class="badge ${statusColor} text-xs" style="text-transform: capitalize;">${call.status}</span>
                        </div>
                        <div class="text-xs text-muted">
                          Duration: ${WebRTC.formatDuration(call.duration_seconds)} • ${new Date(call.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button class="btn btn-secondary btn-sm callback-btn" data-type="${call.call_type}">
                      Call Back
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  renderActiveCallStage() {
    const isMuted = WebRTC.isMuted;
    const isCameraOff = WebRTC.isCameraOff;
    const isScreenSharing = WebRTC.isScreenSharing;
    const duration = WebRTC.formatDuration(WebRTC.callDurationSec);

    return `
      <div class="view-container" style="position: relative; height: calc(100vh - var(--header-height) - 40px); display: flex; flex-direction: column;">
        <!-- In-Call Header HUD -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-3); padding: 10px 18px; background: rgba(26, 27, 34, 0.95); backdrop-filter: blur(8px); border-color: var(--accent-primary);">
          <div class="flex items-center gap-3">
            <span class="status-dot"></span>
            <div>
              <div class="text-sm font-semibold flex items-center gap-2">
                <span>Active P2P Call</span>
                <span class="badge badge-violet text-xs" style="text-transform: uppercase;">${WebRTC.callType}</span>
                ${isScreenSharing ? `<span class="badge badge-champagne text-xs">Screen Sharing</span>` : ''}
              </div>
              <div class="text-xs text-muted">SRTP Encrypted • Direct Stream</div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="badge badge-champagne text-sm font-mono" id="call-timer-hud" style="padding: 4px 10px;">
              ${duration}
            </div>
          </div>
        </div>

        <!-- Video Call Main Stage -->
        <div id="active-call-stage" class="card flex-1" style="background: #08090c; border: 1px solid var(--border-medium); border-radius: var(--radius-xl); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <!-- Remote Video Surface -->
          <video id="remote-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>

          <!-- Voice Call Center Avatar (When audio-only) -->
          ${WebRTC.callType === 'audio' ? `
            <div class="text-center" style="position: absolute; z-index: 2;">
              <div class="brand-emblem" style="width: 80px; height: 80px; font-size: 2.2rem; margin: 0 auto var(--space-3); box-shadow: 0 0 24px var(--accent-primary-glow);">
                P2
              </div>
              <h3 style="font-size: var(--text-md); font-weight: 600;">Partner</h3>
              <p class="text-xs text-muted" style="margin-top: 4px;">Voice Stream Connected</p>
            </div>
          ` : ''}

          <!-- Floating Local Video PiP Preview -->
          <div style="position: absolute; top: 16px; right: 16px; width: 160px; aspect-ratio: 16/9; background: #16171d; border: 2px solid var(--accent-primary); border-radius: var(--radius-md); overflow: hidden; z-index: 10; box-shadow: var(--shadow-lg);">
            <video id="local-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
            <div style="position: absolute; bottom: 4px; left: 6px; font-size: 10px; color: #ffffff; background: rgba(0,0,0,0.6); padding: 1px 4px; border-radius: 2px;">
              You
            </div>
          </div>

          <!-- Bottom In-Call Control Bar Overlay -->
          <div style="position: absolute; bottom: 24px; display: flex; align-items: center; gap: var(--space-3); background: rgba(24, 25, 32, 0.92); padding: 10px 20px; border-radius: var(--radius-full); border: 1px solid var(--border-medium); backdrop-filter: blur(12px); z-index: 20;">
            <button class="btn btn-icon ${isMuted ? 'btn-danger' : 'btn-secondary'}" id="toggle-mic-btn" title="${isMuted ? 'Unmute Microphone' : 'Mute Microphone'}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
            </button>

            ${WebRTC.callType === 'video' ? `
              <button class="btn btn-icon ${isCameraOff ? 'btn-danger' : 'btn-secondary'}" id="toggle-camera-btn" title="${isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}">
                ${Icons.memories}
              </button>
            ` : ''}

            <button class="btn btn-icon ${isScreenSharing ? 'btn-primary' : 'btn-secondary'}" id="toggle-screen-btn" title="Share Screen">
              ${Icons.devices}
            </button>

            <button class="btn btn-icon btn-danger" id="hangup-call-btn" title="End Call" style="width: 44px; height: 44px; margin-left: var(--space-2);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  mount(container) {
    // 1. Idle Controls
    const startVoiceBtn = container.querySelector('#start-voice-call-btn');
    const startVideoBtn = container.querySelector('#start-video-call-btn');

    if (startVoiceBtn) {
      startVoiceBtn.addEventListener('click', async () => {
        await WebRTC.startCall('audio');
        window.AppRouter?.handleRouting();
      });
    }

    if (startVideoBtn) {
      startVideoBtn.addEventListener('click', async () => {
        await WebRTC.startCall('video');
        window.AppRouter?.handleRouting();
      });
    }

    container.querySelectorAll('.callback-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.getAttribute('data-type') || 'audio';
        await WebRTC.startCall(type);
        window.AppRouter?.handleRouting();
      });
    });

    // 2. Active Stage Controls
    const micBtn = container.querySelector('#toggle-mic-btn');
    const camBtn = container.querySelector('#toggle-camera-btn');
    const screenBtn = container.querySelector('#toggle-screen-btn');
    const hangupBtn = container.querySelector('#hangup-call-btn');
    const localVideo = container.querySelector('#local-video');
    const remoteVideo = container.querySelector('#remote-video');
    const timerHud = container.querySelector('#call-timer-hud');

    if (localVideo && WebRTC.localStream) {
      localVideo.srcObject = WebRTC.localStream;
    }

    if (remoteVideo && WebRTC.remoteStream) {
      remoteVideo.srcObject = WebRTC.remoteStream;
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const muted = WebRTC.toggleMute();
        micBtn.classList.toggle('btn-danger', muted);
        micBtn.classList.toggle('btn-secondary', !muted);
      });
    }

    if (camBtn) {
      camBtn.addEventListener('click', () => {
        const off = WebRTC.toggleCamera();
        camBtn.classList.toggle('btn-danger', off);
        camBtn.classList.toggle('btn-secondary', !off);
      });
    }

    if (screenBtn) {
      screenBtn.addEventListener('click', async () => {
        await WebRTC.toggleScreenShare();
        screenBtn.classList.toggle('btn-primary', WebRTC.isScreenSharing);
        screenBtn.classList.toggle('btn-secondary', !WebRTC.isScreenSharing);
      });
    }

    if (hangupBtn) {
      hangupBtn.addEventListener('click', async () => {
        await WebRTC.endCall();
        window.AppRouter?.handleRouting();
      });
    }

    // 3. Real-Time Duration Timer Updates
    this.unsubTimer = WebRTC.subscribe('timer', (sec) => {
      if (timerHud) {
        timerHud.textContent = WebRTC.formatDuration(sec);
      }
    });

    this.unsubEnd = WebRTC.subscribe('callEnded', () => {
      window.AppRouter?.handleRouting();
    });
  },

  unmount() {
    if (this.unsubTimer) this.unsubTimer();
    if (this.unsubEnd) this.unsubEnd();
  }
};
