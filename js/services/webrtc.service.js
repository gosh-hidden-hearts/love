/**
 * GOSH WEBRTC CALLING & SIGNALING SERVICE (PHASE 8)
 * Direct P2P Audio/Video Calling, Google STUN discovery, and Screen Sharing.
 */

import { DB } from './db.service.js';
import { Auth } from './auth.service.js';
import { State } from '../state.js';
import { Toast } from '../components/toast.js';

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.callActive = false;
    this.callType = 'audio'; // 'audio' or 'video'
    this.callDurationSec = 0;
    this.timerInterval = null;
    this.isMuted = false;
    this.isCameraOff = false;
    this.isScreenSharing = false;
    this.connectionState = 'disconnected';
    this.activePartner = null;

    // Free Google STUN Servers
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];

    this.listeners = new Map();
  }

  // 1. INITIALIZE PEER CONNECTION
  createPeerConnection() {
    if (typeof RTCPeerConnection === 'undefined') {
      console.warn('[GOSH WEBRTC] RTCPeerConnection not supported in this environment.');
      return null;
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitSignaling('ice-candidate', { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('[GOSH WEBRTC] Remote track received:', event.track.kind);
      this.remoteStream = event.streams[0];
      this.notify('remoteStream', this.remoteStream);
    };

    pc.onconnectionstatechange = () => {
      this.connectionState = pc.connectionState;
      this.notify('connectionState', this.connectionState);
      console.log('[GOSH WEBRTC] Connection State:', pc.connectionState);

      if (pc.connectionState === 'connected') {
        this.startTimer();
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.stopTimer();
      }
    };

    this.peerConnection = pc;
    return pc;
  }

  // 2. INITIATE OUTGOING CALL
  async startCall(type = 'video', partnerId = 'u2-auth-0000-0000-000000000002') {
    if (!Auth.isAuthenticated()) throw new Error('Authentication required.');

    const currentUser = Auth.getCurrentUser();
    this.callType = type;
    this.activePartner = partnerId;
    this.callActive = true;
    this.callDurationSec = 0;

    // Get User Media
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video'
        });
      } else {
        this.localStream = null;
      }
    } catch (err) {
      console.warn('[GOSH WEBRTC] Media device capture error (simulating stream):', err.message);
      this.localStream = null;
    }

    const pc = this.createPeerConnection();
    if (pc && this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }

    // Create & Dispatch SDP Offer
    if (pc) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.emitSignaling('sdp-offer', { sdp: offer, callType: type });
    }

    // Record Call Initiation
    Toast.info('Calling Partner...', `${type === 'video' ? 'Video' : 'Voice'} call connecting via STUN.`);
    this.notify('callStarted', { type, isOutgoing: true });

    return { type, partnerId };
  }

  // 3. ACCEPT INCOMING CALL
  async acceptCall(offerData) {
    this.callActive = true;
    this.callType = offerData.callType || 'video';
    this.callDurationSec = 0;

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: this.callType === 'video'
        });
      }
    } catch (err) {
      console.warn('[GOSH WEBRTC] Accept media error:', err);
    }

    const pc = this.createPeerConnection();
    if (pc && this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }

    if (pc && offerData.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(offerData.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.emitSignaling('sdp-answer', { sdp: answer });
    }

    this.startTimer();
    this.notify('callStarted', { type: this.callType, isOutgoing: false });
    return true;
  }

  // 4. END / HANGUP CALL
  async endCall() {
    if (!this.callActive) return;

    this.stopTimer();

    // Log call to call_history table
    const currentUser = Auth.getCurrentUser();
    if (currentUser) {
      await DB.insert('call_history', {
        caller_id: currentUser.id,
        receiver_id: this.activePartner || 'u2-auth-0000-0000-000000000002',
        call_type: this.callType,
        duration_seconds: this.callDurationSec,
        status: this.callDurationSec > 0 ? 'completed' : 'rejected'
      }).catch(err => console.warn('Failed to log call history:', err));
    }

    // Clean up media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.callActive = false;
    this.isScreenSharing = false;
    this.isMuted = false;
    this.isCameraOff = false;

    this.emitSignaling('call-hangup', {});
    this.notify('callEnded', { duration: this.callDurationSec });
    Toast.info('Call Ended', `Duration: ${this.formatDuration(this.callDurationSec)}`);
  }

  // 5. MEDIA CONTROLS (MIC & CAMERA)
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
    }
    this.notify('mediaControls', { isMuted: this.isMuted, isCameraOff: this.isCameraOff });
    return this.isMuted;
  }

  toggleCamera() {
    this.isCameraOff = !this.isCameraOff;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = !this.isCameraOff);
    }
    this.notify('mediaControls', { isMuted: this.isMuted, isCameraOff: this.isCameraOff });
    return this.isCameraOff;
  }

  // 6. SCREEN SHARING
  async toggleScreenShare() {
    if (!this.callActive) return false;

    if (!this.isScreenSharing) {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          this.screenStream = stream;
          const screenTrack = stream.getVideoTracks()[0];

          // Replace track in peer connection
          if (this.peerConnection) {
            const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(screenTrack);
            }
          }

          screenTrack.onended = () => {
            this.stopScreenShare();
          };

          this.isScreenSharing = true;
          this.notify('screenSharing', true);
          Toast.success('Screen Sharing Active', 'Your screen is now visible to your partner.');
          return true;
        }
      } catch (err) {
        Toast.error('Screen Share Failed', err.message || 'Permission denied.');
        return false;
      }
    } else {
      await this.stopScreenShare();
      return false;
    }
  }

  async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    // Restore camera track
    if (this.peerConnection && this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack);
      }
    }

    this.isScreenSharing = false;
    this.notify('screenSharing', false);
    Toast.info('Screen Sharing Stopped', 'Restored camera video stream.');
  }

  // 7. TIMER UTILITY
  startTimer() {
    this.stopTimer();
    this.callDurationSec = 0;
    this.timerInterval = setInterval(() => {
      this.callDurationSec++;
      this.notify('timer', this.callDurationSec);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 8. SIGNALING DISPATCH
  emitSignaling(type, payload) {
    console.log(`[GOSH SIGNALING ${type.toUpperCase()}]`, payload);
    // In production: dispatches to Supabase Realtime channel `gosh_webrtc_signaling`
    this.notify('signaling', { type, payload });
  }

  // 9. EVENT EMITTER FOR UI
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => {
      const subs = this.listeners.get(event);
      if (subs) subs.delete(callback);
    };
  }

  notify(event, data) {
    const subs = this.listeners.get(event);
    if (subs) {
      subs.forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }
}

export const WebRTC = new WebRTCService();
