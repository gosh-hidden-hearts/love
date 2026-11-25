# GOSH (Hidden Hearts) — System Architecture

---

## 1. Executive Architecture Summary

**GOSH (Hidden Hearts)** is a production-grade, zero-cost social networking and instant messaging ecosystem inspired by WhatsApp with a unique romantic identity. It is built to ensure complete privacy, real-time communication, and resilient operation using strictly free-tier infrastructure.

---

## 2. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | Web Browser (React)|   | Android PWA/Capacitor |   | Desktop Installed PWA  |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|            |                          |                           |               |
|            +--------------------------+---------------------------+               |
|                                       |                                           |
|       +-------------------------------+-------------------------------+           |
|       |                               |                               |           |
|       v                               v                               v           |
|  +--------------------+      +--------------------+      +--------------------+   |
|  | Web Crypto API     |      | Socket.io Client   |      | WebRTC Audio/Video |   |
|  | (ECDH P-256 / AES) |      | (Real-time events) |      | (RTCPeerConnection)|   |
|  +--------------------+      +--------------------+      +--------------------+   |
+-------|-------------------------------|-------------------------------|-----------+
        |                               |                               |
        | Public Keys & REST            | WebSocket Signaling           | P2P Encrypted
        v                               v                               | Media Stream
+-------------------------------------------------------+               |
|                    BACKEND SERVICES                   |               |
|                     (Node.js / Express)               |               |
|                                                       |               |
|  +--------------------+      +--------------------+   |               |
|  | REST API Endpoints |      | Socket.io Gateway  |   |               |
|  | - Auth / JWT       |      | - Signaling Relay  |   |               |
|  | - Messages / Groups|      | - Presence Engine  |   |               |
|  | - Status / Vault   |      | - Typing Heartbeat |   |               |
|  | - E2EE Keys        |      | - Call Notifications|  |               |
|  +--------------------+      +--------------------+   |               |
+-----------|---------------------------|---------------+               |
            |                           |                               |
            v                           v                               v
+-----------------------+   +-----------------------+   +-----------------------+
|   DATA & STORAGE      |   |   COMMUNICATION INFRA |   |  GOOGLE STUN RELAY    |
|                       |   |                       |   |                       |
| - Supabase PostgreSQL |   | - Google SMTP (TLS)   |   | - stun.l.google.com   |
| - Local Failover Store|   |   (Port 587, OTP)     |   |   Port 19302          |
| - MEGA Cloud Storage  |   | - Nodemailer Server   |   | - ICE Candidates      |
|   (20GB encrypted)    |   |                       |   |                       |
+-----------------------+   +-----------------------+   +-----------------------+
```

---

## 3. Technology Stack Breakdown

| Subsystem | Technology | Purpose | Free-Tier Strategy |
|---|---|---|---|
| **Frontend UI** | React 18 + Vite | Single-Page Application (SPA) | 100% Free Open Source |
| **Styling** | Tailwind CSS + Glassmorphism | Custom Romantic Dark Aesthetic | 100% Free Open Source |
| **Realtime Engine** | Socket.io v4 | WebSockets for messaging, presence & signaling | Free self-hosted on Node backend |
| **Database** | Supabase PostgreSQL + Fallback | Relational persistence with JSON fallback | Free Supabase Tier (500MB DB) |
| **Auth Layer** | Firebase Auth + JWT + OTP | Email/Pass, Google OAuth, Phone/Email OTP | Free Firebase Spark (Email & OAuth) |
| **OTP Service** | Google SMTP (Nodemailer) | 6-digit cryptographic verification codes | Free 500 emails/day via Gmail SMTP |
| **Cloud Storage** | MEGA Cloud Storage (`megajs`) | Media Vault streaming storage (20GB) | Free 20GB permanent MEGA account |
| **Calling** | Native WebCrypto + WebRTC | P2P Encrypted Audio/Video Calling | Google Public STUN (`stun.l.google.com`) |
| **Encryption** | Web Crypto API (W3C standard) | ECDH P-256 key exchange & AES-256-GCM | Client-side native, zero cost |
| **Mobile** | Capacitor v6 + PWA Manifest | Cross-platform Android APK / iOS container | Free Open Source (MIT) |

---

## 4. End-to-End Encryption (E2EE) Architecture

GOSH implements zero-knowledge end-to-end encryption for all 1-to-1 conversations:

```
Alice Device                                    Server / Database                             Bob Device
============                                    =================                             ==========
1. Generates ECDH (P-256) Keypair                                                             1. Generates ECDH (P-256) Keypair
   - PrivKey_A (IndexedDB)                                                                       - PrivKey_B (IndexedDB)
   - PubKey_A (Exported JWK) ----------------> Saves PubKey_A                                    - PubKey_B (Exported JWK) ---> Saves PubKey_B
                                                Saves PubKey_B <--------------------------------

2. Requests Bob's PubKey_B <----------------- Fetches PubKey_B
3. Derives SharedSecret_AB
   (ECDH: PrivKey_A + PubKey_B)
4. Derives AES-256-GCM Key
5. Encrypts message:
   - Random 12-byte IV
   - Ciphertext = AES_GCM(msg, Key, IV)
6. Emits { ciphertext, iv, isEncrypted } ---> Relays Ciphertext Only -----------------------> 7. Receives Ciphertext
                                              (Unreadable to Server)                          8. Requests Alice's PubKey_A
                                                                                              9. Derives SharedSecret_AB
                                                                                                 (ECDH: PrivKey_B + PubKey_A)
                                                                                              10. Decrypts plaintext message
```

---

## 5. WebRTC Calling Signaling Flow

```
Caller                                            Backend Gateway                                      Receiver
======                                            ===============                                      ========
1. startCall(audio/video)
2. getUserMedia()
3. createOffer()
4. emit("call_user", offer) -------------------> socket.to(receiver).emit("incoming_call") --------> 5. Plays ringtone
                                                                                                      6. Shows Incoming Call Modal
                                                                                                      7. acceptCall()
                                                                                                      8. getUserMedia()
                                                                                                      9. setRemoteDescription(offer)
                                                                                                      10. createAnswer()
12. Receives answer <--------------------------- socket.to(caller).emit("call_accepted", answer) <-- 11. emit("accept_call", answer)
13. setRemoteDescription(answer)
14. ICE Candidate Exchange <-------------------- socket relay candidates ---------------------------> 14. ICE Candidate Exchange
================================================================================================================
                                   DIRECT P2P ENCRYPTED WEBRTC MEDIA FLOW
================================================================================================================
```

---

## 6. Resilience & Fallback Design

1. **Dual Database Persistence**:
   - `databaseRepository.js` operates against Supabase PostgreSQL whenever reachable.
   - If Supabase table queries fail (e.g. offline development or network partition), the repository automatically writes and reads from local atomic `backend/data/store.json`.
2. **MEGA Storage Proxy**:
   - Files are streamed directly to MEGA cloud storage via `megajs`.
   - If direct cloud stream encounters temporary network blocks, files are safely mirrored and served via authenticated local static proxy.
3. **Audio Tone Synthesis**:
   - Dial tones, ringtones, and connection chimes are synthesized directly in the browser using the Web Audio API (`AudioContext`), eliminating external static audio hosting dependencies and ensuring 100% zero-latency audio cues.
