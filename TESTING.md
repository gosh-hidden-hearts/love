# GOSH (Hidden Hearts) — Testing & Quality Assurance Plan

---

## 1. Test Strategy Overview

Testing for GOSH spans automated builds, backend API integration suites, and manual multi-device verification checklists across all phases.

---

## 2. Automated Test Commands

### 2.1 Frontend Build & Asset Verification
Verifies TypeScript/JSX syntax, Vite bundling, Tailwind CSS generation, and dynamic asset imports:
```bash
npm run build:frontend
```
*Expected Result: Exit code 0, all modules transformed without errors.*

### 2.2 Backend Test Suite
Executes the API test runner against local endpoints:
```bash
# 1. Start backend server in test mode
npm run start:backend &

# 2. Run backend API tests
npm run test:backend
```

---

## 3. Manual Verification Checklist by Phase

### Phase 1: Romantic UI/UX Foundation
- [x] Dark romantic palette (`#08090e`, `#0f111a`, `#141724`, `#f43f5e`, `#25d366`) applied across all views.
- [x] Responsive layout collapses to WhatsApp-style mobile navigation bar on screens `<768px`.
- [x] Profile quick slide-over drawer opens and navigates cleanly to Accounts, Settings, and Vault.

### Phase 2: Authentication & Multi-Identifier Login
- [x] Registration accepts Full Name, Username, Mobile, Email, and Password.
- [x] Login supports Email + Password as well as Phone / Email 6-digit OTP.
- [x] Real Google SMTP dispatches 6-digit verification codes to user's email address.
- [x] JWT token is issued, stored in `localStorage`, and attached via `Authorization: Bearer <token>`.

### Phase 3: Contacts & User Discovery
- [x] Search filters by username, email, and phone number without exposing sensitive fields.
- [x] Adding a contact updates the contact list in real time.
- [x] Online presence heartbeats broadcast via Socket.io and update status pill in header.

### Phase 4: Messaging & Voice Notes
- [x] Real-time 1-to-1 message delivery via WebSocket.
- [x] Voice notes record audio via browser `MediaRecorder`, upload to `/api/messages/upload`, and playback with audio seekbar.
- [x] Media attachments (images, videos, documents) upload to `/uploads/` and render preview cards.
- [x] Message delivery ticks: sent (single tick), delivered (double grey), read (double cyan/blue).
- [x] Group chat creation modal creates groups with multiple participants.

### Phase 5: WebRTC Audio & Video Calling
- [x] Outgoing call initiates and synthesizes dialing tone via Web Audio API.
- [x] Incoming call modal rings with romantic chime and displays caller avatar.
- [x] In-call controls mute microphone, toggle video camera, flip front/rear camera, and share screen.
- [x] Call history accurately logs duration, partner details, and supports one-click call back.

### Phase 6: 24-Hour Ephemeral Status Updates
- [x] Text statuses render with selected romantic gradient backgrounds.
- [x] Photo/video statuses upload with sweet captions.
- [x] Full-screen status viewer features 5-second progress bars and tap-to-advance.
- [x] Viewing another user's status records the viewer and increments viewer count.
- [x] Authors can delete their own status update with instant removal.
- [x] Expired statuses (`> 24 hours`) are automatically filtered out.

### Phase 7: Memory Vault (MEGA Cloud Storage)
- [x] Media uploads stream to MEGA cloud storage via `megajs` with metadata in PostgreSQL.
- [x] Custom albums can be created dynamically via "+ New Album".
- [x] Lightbox displays photos in high resolution with feelings tags.
- [x] Direct file deletion purges both database records and cloud storage nodes.

### Phase 8: End-to-End Encryption (E2EE)
- [x] ECDH P-256 keypairs generated in client Web Crypto API.
- [x] Public keys stored in database; private keys remain exclusively in client `localStorage`.
- [x] 1-to-1 message payloads encrypted with AES-256-GCM before socket emission.
- [x] Incoming ciphertexts decrypted back to plaintext seamlessly.
- [x] WhatsApp-style security notice banner rendered at the top of conversations.

### Phase 9: Settings & Passcode Vault
- [x] Settings toggles persist to `user_settings` table / store.
- [x] Passcode Vault saves 4-digit PIN hashed with SHA-256.
- [x] Test unlock unlocks private spaces upon entering the correct PIN.

### Phase 10: Multi-Platform (PWA & Mobile)
- [x] Web App Manifest (`manifest.json`) valid and installable on Desktop & Mobile.
- [x] Capacitor configuration (`capacitor.config.json`) ready for Android Studio APK builds.
