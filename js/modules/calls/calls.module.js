/**
 * GOSH WHATSAPP-STYLE CALLS MODULE (PHASE 6)
 * Direct P2P WebRTC Video, Voice Calling, Screen Sharing & Romantic Mobile UI.
 */

import { Icons } from '../../components/icons.js';
import { WebRTC } from '../../services/webrtc.service.js';
import { DB } from '../../services/db.service.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';
import { ConnectModule } from '../connect/connect.module.js';

export const CallsModule = {
  activeCallPartner: null,

  async render() {
    const history = await DB.query('call_history', null, (a, b) => new Date(b.created_at) - new Date(a.created_at)).catch(() => []);
    const isCallActive = WebRTC.callActive;

    // Resolve partner details from active chat selection or default
    const partner = this.activeCallPartner || ConnectModule.selectedContact || {
      displayName: 'Partner',
      fullName: 'Partner',
      username: 'partner'
    };

    if (isCallActive) {
      return this.renderActiveCallStage(partner);
    }

    return `
      <div class="view-container flex flex-col" style="height: calc(100vh - var(--header-height) - var(--bottom-nav-height)); padding: var(--space-4);">
        
        <!-- Top Calls Header & Quick Dial -->
        <div class="card flex justify-between items-center" style="margin-bottom: var(--space-4); background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: var(--space-4);">
          <div>
            <div class="badge badge-champagne text-xs" style="margin-bottom: 4px;">
              P2P WebRTC Direct Audio & Video
            </div>
            <h1 class="card-title" style="font-size: 1.25rem; color: var(--ivory-50); margin: 0;">GOSH Calls</h1>
            <p class="text-muted text-xs" style="margin-top: 2px;">Encrypted media communication • Direct P2P</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm flex items-center gap-1" id="start-voice-call-btn" style="border: 1px solid var(--border-subtle);">
              <span>📞</span>
              <span>Voice Call</span>
            </button>
            <button class="btn btn-primary btn-sm flex items-center gap-1" id="start-video-call-btn" style="background: linear-gradient(135deg, var(--wine-600), var(--wine-500)); border: 1px solid var(--rose-400);">
              <span>🎥</span>
              <span>Video Call</span>
            </button>
          </div>
        </div>

        <!-- WhatsApp-Style Call Lobby Stage -->
        <div class="card text-center flex flex-col items-center justify-center" style="padding: 32px var(--space-4); background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(139, 38, 75, 0.1) 100%); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); margin-bottom: var(--space-4);">
          <div class="love-glow" style="width: 72px; height: 72px; border-radius: 50%; margin: 0 auto var(--space-3); background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; border: 2px solid var(--rose-400); box-shadow: 0 4px 20px rgba(139, 38, 75, 0.45);">
            ${(partner.fullName || partner.displayName || 'P').substring(0, 2).toUpperCase()}
          </div>
          <h3 style="font-size: 1.15rem; color: var(--ivory-50); font-weight: 700; margin: 0;">Ready to Call</h3>
          <p class="text-xs text-muted" style="margin-top: 4px; max-width: 260px;">
            Start an encrypted voice or video call with ${partner.fullName || partner.displayName}
          </p>
          <div class="flex items-center gap-2" style="margin-top: var(--space-3);">
            <span class="status-dot"></span>
            <span class="text-xs" style="color: var(--color-success);">SRTP Channel Standby</span>
          </div>
        </div>

        <!-- Recent Call History List -->
        <div class="card flex-1 flex flex-col" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); overflow: hidden; padding: var(--space-3) var(--space-4);">
          <div class="flex justify-between items-center" style="margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--border-subtle);">
            <h2 class="card-title" style="font-size: 0.95rem; color: var(--rose-200); margin: 0;">Recent Calls (${history.length})</h2>
            <span class="badge badge-champagne text-xs">P2P History</span>
          </div>

          <div style="flex: 1; overflow-y: auto;">
            ${history.length === 0 ? `
              <div class="text-center" style="padding: 30px 0;">
                <div style="font-size: 2rem; color: var(--rose-300); margin-bottom: 8px;">📞</div>
                <h4 style="font-size: 0.9rem; color: var(--ivory-50); margin: 0;">No Recent Calls</h4>
                <p class="text-xs text-muted" style="margin-top: 4px;">Outgoing and incoming call sessions will appear here.</p>
              </div>
            ` : `
              <div class="flex flex-col gap-2">
                ${history.map(call => {
                  const isVideo = call.call_type === 'video';
                  return `
                    <div class="flex justify-between items-center" style="padding: 10px 12px; background: var(--bg-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                      <div class="flex items-center gap-3">
                        <div style="font-size: 1.25rem; color: ${isVideo ? 'var(--rose-400)' : 'var(--color-success)'};">
                          ${isVideo ? '🎥' : '📞'}
                        </div>
                        <div>
                          <div class="text-sm font-semibold flex items-center gap-2" style="color: var(--ivory-50);">
                            <span style="text-transform: capitalize;">${call.call_type} Call</span>
                            <span class="badge ${call.status === 'completed' ? 'badge-success' : 'badge-danger'} text-xs">${call.status}</span>
                          </div>
                          <div class="text-xs text-muted">
                            Duration: ${WebRTC.formatDuration(call.duration_seconds)} • ${new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <button class="btn btn-ghost btn-sm callback-btn" data-type="${call.call_type}" style="color: var(--champagne-300); border: 1px solid var(--border-subtle);">
                        Call Back
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

      </div>
    `;
  },

  // ACTIVE WHATSAPP CALLING STAGE (VOICE / VIDEO)
  renderActiveCallStage(partner) {
    const isMuted = WebRTC.isMuted;
    const isCameraOff = WebRTC.isCameraOff;
    const isScreenSharing = WebRTC.isScreenSharing;
    const duration = WebRTC.formatDuration(WebRTC.callDurationSec);
    const isVideo = WebRTC.callType === 'video';
    const partnerName = partner.fullName || partner.displayName || 'Partner';
    const partnerInitials = partnerName.substring(0, 2).toUpperCase();

    return `
      <div class="view-container flex flex-col justify-between" style="height: calc(100vh - var(--header-height) - var(--bottom-nav-height)); position: relative; background: radial-gradient(circle at center, rgba(139, 38, 75, 0.25) 0%, #0d060e 100%); overflow: hidden; padding: var(--space-4);">
        
        <!-- Top Call HUD Bar -->
        <div class="flex justify-between items-center" style="z-index: 20; background: rgba(26, 13, 29, 0.85); backdrop-filter: blur(12px); padding: 8px 14px; border-radius: var(--radius-full); border: 1px solid var(--border-subtle);">
          <div class="flex items-center gap-2">
            <span class="status-dot"></span>
            <span class="text-xs font-semibold" style="color: var(--ivory-50); text-transform: uppercase;">
              ${WebRTC.callType} CALL
            </span>
            ${isScreenSharing ? `<span class="badge badge-champagne text-xs">Screen Sharing</span>` : ''}
          </div>
          <div class="text-xs font-mono font-bold" id="call-timer-hud" style="color: var(--champagne-300); letter-spacing: 0.05em;">
            ${duration}
          </div>
        </div>

        <!-- Call Center Visual: Video Surfaces OR Voice Glow Avatar -->
        ${isVideo ? `
          <!-- Remote Full Video Stream -->
          <div id="active-call-stage" style="position: absolute; inset: 0; z-index: 5; background: #000000;">
            <video id="remote-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
            
            <!-- Local Video Preview PiP -->
            <div style="position: absolute; top: 70px; right: 16px; width: 110px; aspect-ratio: 9/16; background: #16171d; border: 2px solid var(--rose-400); border-radius: var(--radius-lg); overflow: hidden; z-index: 15; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
              <video id="local-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
              <div style="position: absolute; bottom: 4px; left: 6px; font-size: 9px; color: #ffffff; background: rgba(0,0,0,0.6); padding: 1px 4px; border-radius: 2px;">
                You
              </div>
            </div>
          </div>
        ` : `
          <!-- Voice Calling Avatar & Ringing HUD -->
          <div id="active-call-stage" class="text-center" style="margin: auto 0; z-index: 10;">
            <div class="love-glow" style="width: 108px; height: 108px; border-radius: 50%; margin: 0 auto var(--space-4); background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 700; border: 3px solid var(--rose-400); box-shadow: 0 0 35px rgba(224, 141, 163, 0.4);">
              ${partnerInitials}
            </div>
            <h2 style="font-size: 1.4rem; color: var(--ivory-50); font-weight: 700; margin: 0;">${partnerName}</h2>
            <div class="text-sm" style="color: var(--rose-300); margin-top: 4px;">Connected • Encrypted P2P Voice</div>
          </div>
        `}

        <!-- WhatsApp-Style Bottom Call Controls Bar -->
        <div class="flex items-center justify-center gap-4" style="z-index: 20; padding: 16px 20px; background: rgba(26, 13, 29, 0.9); backdrop-filter: blur(16px); border-radius: var(--radius-full); border: 1px solid var(--border-subtle); margin: 0 auto; max-width: 380px;">
          
          <!-- Mute Microphone Button -->
          <button class="btn btn-icon" id="toggle-mic-btn" title="${isMuted ? 'Unmute' : 'Mute'}" style="width: 48px; height: 48px; border-radius: 50%; background: ${isMuted ? '#ef4444' : 'var(--bg-elevated)'}; color: var(--ivory-50); border: 1px solid var(--border-subtle);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </button>

          <!-- Toggle Camera (If Video Call) -->
          ${isVideo ? `
            <button class="btn btn-icon" id="toggle-camera-btn" title="${isCameraOff ? 'Camera On' : 'Camera Off'}" style="width: 48px; height: 48px; border-radius: 50%; background: ${isCameraOff ? '#ef4444' : 'var(--bg-elevated)'}; color: var(--ivory-50); border: 1px solid var(--border-subtle);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
            </button>
          ` : `
            <!-- Switch to Video Button (If Voice Call) -->
            <button class="btn btn-icon" id="upgrade-to-video-btn" title="Switch to Video" style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-elevated); color: var(--rose-300); border: 1px solid var(--border-subtle);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
            </button>
          `}

          <!-- Screen Share Toggle -->
          <button class="btn btn-icon" id="toggle-screen-btn" title="Share Screen" style="width: 48px; height: 48px; border-radius: 50%; background: ${isScreenSharing ? 'var(--wine-600)' : 'var(--bg-elevated)'}; color: var(--ivory-50); border: 1px solid var(--border-subtle);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>
          </button>

          <!-- WhatsApp-Style Red Hangup Button -->
          <button class="btn btn-icon" id="hangup-call-btn" title="End Call" style="width: 52px; height: 52px; border-radius: 50%; background: #ef4444; color: #ffffff; border: none; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>
          </button>

        </div>

      </div>
    `;
  },

  mount(container) {
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

    // Call back buttons in history
    container.querySelectorAll('.callback-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.getAttribute('data-type');
        await WebRTC.startCall(type || 'audio');
        window.AppRouter?.handleRouting();
      });
    });

    // In-Call Controls
    const toggleMicBtn = container.querySelector('#toggle-mic-btn');
    const toggleCameraBtn = container.querySelector('#toggle-camera-btn');
    const upgradeVideoBtn = container.querySelector('#upgrade-to-video-btn');
    const toggleScreenBtn = container.querySelector('#toggle-screen-btn');
    const hangupBtn = container.querySelector('#hangup-call-btn');

    if (toggleMicBtn) {
      toggleMicBtn.addEventListener('click', () => {
        const isMuted = WebRTC.toggleMic();
        Toast.info('Microphone', isMuted ? 'Muted' : 'Unmuted');
        window.AppRouter?.handleRouting();
      });
    }

    if (toggleCameraBtn) {
      toggleCameraBtn.addEventListener('click', () => {
        const isOff = WebRTC.toggleCamera();
        Toast.info('Camera', isOff ? 'Disabled' : 'Enabled');
        window.AppRouter?.handleRouting();
      });
    }

    if (upgradeVideoBtn) {
      upgradeVideoBtn.addEventListener('click', async () => {
        await WebRTC.endCall();
        await WebRTC.startCall('video');
        window.AppRouter?.handleRouting();
      });
    }

    if (toggleScreenBtn) {
      toggleScreenBtn.addEventListener('click', async () => {
        try {
          await WebRTC.toggleScreenShare();
          Toast.info('Screen Sharing', WebRTC.isScreenSharing ? 'Active' : 'Stopped');
          window.AppRouter?.handleRouting();
        } catch (err) {
          Toast.error('Screen Share Error', err.message);
        }
      });
    }

    if (hangupBtn) {
      hangupBtn.addEventListener('click', async () => {
        await WebRTC.endCall();
        Toast.info('Call Ended', 'Session logged to call history.');
        window.AppRouter?.handleRouting();
      });
    }

    // Bind WebRTC streams to video elements if present
    if (WebRTC.callActive) {
      const localVideo = container.querySelector('#local-video');
      const remoteVideo = container.querySelector('#remote-video');
      if (localVideo && WebRTC.localStream) {
        localVideo.srcObject = WebRTC.localStream;
      }
      if (remoteVideo && WebRTC.remoteStream) {
        remoteVideo.srcObject = WebRTC.remoteStream;
      }

      this.timerInterval = setInterval(() => {
        const hud = container.querySelector('#call-timer-hud');
        if (hud) hud.textContent = WebRTC.formatDuration(WebRTC.callDurationSec);
      }, 1000);
    }
  },

  unmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
};
