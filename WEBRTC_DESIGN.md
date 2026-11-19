# GOSH — WEBRTC CALLING & SCREEN SHARING ARCHITECTURE

---

## 1. Real-Time WebRTC Subsystem

GOSH implements low-latency, peer-to-peer audio calling, HD video calling, and screen sharing between User 1 and User 2.

```
[User 1 Device] <─── DTLS-SRTP (Encrypted Media) ───> [User 2 Device]
      │                                                     │
      │                  Signaling Events                   │
      ▼                (SDP Offers / ICE)                   ▼
┌─────────────────────────────────────────────────────────────┐
│       Supabase Realtime Broadcast Channel (WebSockets)      │
└─────────────────────────────────────────────────────────────┘
                              │
                    Public STUN Candidates
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             Google STUN (stun.l.google.com:19302)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Signaling Specification

Signaling packets are dispatched over Supabase Realtime channel `gosh_call_room`:

1. `call-invite`: `{ callerId, mediaType: 'audio' | 'video', timestamp }`
2. `call-accept`: `{ receiverId, timestamp }`
3. `call-reject`: `{ receiverId, reason }`
4. `sdp-offer`: `{ sdp: RTCSessionDescriptionInit }`
5. `sdp-answer`: `{ sdp: RTCSessionDescriptionInit }`
6. `ice-candidate`: `{ candidate: RTCIceCandidateInit }`
7. `call-hangup`: `{ callerId }`

---

## 3. Screen Sharing Capability

- **Desktop & Modern Browsers:** Uses standard `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })`.
- **Android App (Capacitor):** WebView WebRTC screen capture is supported on Android 10+ via Chromium WebView display media prompts, supplemented by Capacitor MediaProjection native bridge if requested.
