import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const [callPartner, setCallPartner] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'calling', 'ringing', 'connected', 'ended'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const durationTimerRef = useRef(null);
  const screenTrackRef = useRef(null);

  // Video element references for rendering
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Setup socket listeners for WebRTC signaling
  useEffect(() => {
    if (!user) return;

    const handleIncomingCall = (data) => {
      console.log('📞 Incoming call received:', data);
      setIncomingCall(data);
      setCallPartner({
        id: data.callerId,
        displayName: data.callerName,
        avatarUrl: data.callerAvatar
      });
      setCallType(data.callType || 'audio');
      setCallStatus('ringing');
    };

    const handleCallAccepted = async (data) => {
      console.log('✅ Call accepted by remote party');
      setCallStatus('connected');
      if (peerConnectionRef.current && data.signal) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
        } catch (e) {
          console.error('Error setting remote description on accept:', e);
        }
      }
      startDurationTimer();
    };

    const handleCallRejected = (data) => {
      console.log('❌ Call rejected by remote party');
      setCallStatus('rejected');
      cleanupCall();
    };

    const handleCallEnded = () => {
      console.log('⏹️ Call ended by remote party');
      cleanupCall();
    };

    const handleIceCandidate = async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    };

    socketService.on('incoming_call', handleIncomingCall);
    socketService.on('call_accepted', handleCallAccepted);
    socketService.on('call_rejected', handleCallRejected);
    socketService.on('call_ended', handleCallEnded);
    socketService.on('ice_candidate', handleIceCandidate);

    return () => {
      socketService.off('incoming_call', handleIncomingCall);
      socketService.off('call_accepted', handleCallAccepted);
      socketService.off('call_rejected', handleCallRejected);
      socketService.off('call_ended', handleCallEnded);
      socketService.off('ice_candidate', handleIceCandidate);
    };
  }, [user]);

  // Duration timer
  const startDurationTimer = () => {
    clearInterval(durationTimerRef.current);
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Create PeerConnection
  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('ice_candidate', {
          targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received remote stream track:', event.streams[0]);
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Start outgoing call
  const startCall = async ({ receiverId, receiverName, receiverAvatar, type = 'audio' }) => {
    try {
      setCallType(type);
      setCallPartner({ id: receiverId, displayName: receiverName, avatarUrl: receiverAvatar });
      setCallStatus('calling');
      setCallActive(true);

      // 1. Get media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Setup RTCPeerConnection
      const pc = createPeerConnection(receiverId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 3. Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 4. Emit call signaling
      socketService.emit('call_user', {
        receiverId,
        callerId: user.id,
        callerName: user.displayName,
        callerAvatar: user.avatarUrl,
        callType: type,
        signal: offer
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      alert('Could not access microphone/camera: ' + err.message);
      cleanupCall();
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      const type = incomingCall.callType || 'audio';
      setCallType(type);
      setCallStatus('connected');
      setCallActive(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(incomingCall.callerId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      if (incomingCall.signal) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit('accept_call', {
        callerId: incomingCall.callerId,
        signal: answer
      });

      setIncomingCall(null);
      startDurationTimer();
    } catch (err) {
      console.error('Failed to accept call:', err);
      rejectCall();
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (incomingCall) {
      socketService.emit('reject_call', { callerId: incomingCall.callerId });
      setIncomingCall(null);
    }
    cleanupCall();
  };

  // End active call
  const endCall = () => {
    const targetId = callPartner?.id || incomingCall?.callerId;
    if (targetId) {
      socketService.emit('end_call', { targetUserId: targetId });
    }
    // Log call to backend
    if (user && callPartner) {
      api.logCall({
        callerId: user.id,
        receiverId: callPartner.id,
        callType,
        callStatus: callStatus === 'connected' ? 'ended' : 'missed',
        durationSeconds: callDuration
      }).catch(console.error);
    }
    cleanupCall();
  };

  // Cleanup helper
  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    clearInterval(durationTimerRef.current);
    setCallActive(false);
    setIncomingCall(null);
    setCallStatus('idle');
    setCallPartner(null);
    setIsScreenSharing(false);
    setCallDuration(0);
  };

  // Toggle Mic
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Sharing
  const toggleScreenSharing = async () => {
    if (!peerConnectionRef.current) return;

    if (isScreenSharing) {
      // Revert to camera track
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenSharing();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      callActive,
      incomingCall,
      callType,
      callPartner,
      callStatus,
      isMuted,
      isVideoEnabled,
      isScreenSharing,
      callDuration,
      localVideoRef,
      remoteVideoRef,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      toggleScreenSharing
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export default CallContext;
