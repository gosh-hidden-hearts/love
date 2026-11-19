# GOSH — Your Space. Your Stories.
### Complete Private Digital Platform | Responsive Web + Android Application

GOSH is a centralized, secure, private digital ecosystem engineered exclusively for exactly two authorized users. It unites end-to-end encrypted messaging, WebRTC audio/video calling, dedicated 20 GB MEGA cloud storage, a zero-knowledge password vault, a shared life journal, calendar, document locker, and device security management into a unified web and Android platform.

---

## Key Principles & Pillars

1. **Security & Privacy First:** Zero-knowledge architecture. Sensitive credentials, diary notes, and confidential documents are encrypted client-side using the Web Crypto API (`AES-256-GCM` with `PBKDF2-HMAC-SHA256`).
2. **Strict Two-User Access Control:** Exactly two pre-authorized user identities (`prasanthgokul736@gmail.com` and `sharanyasiva4@gmail.com`). No public registration, no guest accounts, no demo credentials.
3. **Verified Zero-Cost Infrastructure:** Powered exclusively by free tiers:
   - **Frontend:** Pure HTML5 / CSS3 / Vanilla JavaScript on GitHub Pages ($0).
   - **Identity:** Multi-step Email OTP and persistent device trust ($0).
   - **Database & Realtime:** Supabase PostgreSQL with 100% Row Level Security ($0).
   - **Storage:** Dedicated MEGA cloud account ($0 / 20 GB free tier).
   - **Calling:** Peer-to-Peer WebRTC over Google public STUN ($0).
   - **Android Packaging:** Open-source Capacitor ($0).
4. **Zero-Build Constraint:** Pure HTML5, CSS3, and native ES Modules with zero compilation or bundler requirement for the web app.

---

## 15 Integrated Modules

- **Module 01: GOSH Authentication & Identity** — Two-account whitelist, Email OTP verification, device fingerprinting, and session revocation.
- **Module 02: GOSH Home Dashboard** — Real-time telemetry, 20 GB MEGA storage tracking, active vault status, upcoming events, and activity stream.
- **Module 03: GOSH Connect** — Real-time private chat, E2EE photo/video attachments, MediaRecorder voice notes, emoji reactions, edit, delete, and disappearing messages TTL.
- **Module 04: GOSH Calls** — Direct P2P WebRTC audio & HD video calling, Google STUN discovery, bidirectional screen sharing, duration timer, and call history DB persistence.
- **Module 05: GOSH Vault** — Zero-knowledge AES-256-GCM password manager, PBKDF2 derivation, volatile memory key storage, 5-minute auto-lock, clipboard auto-purge, cryptographically secure password generator & strength meter.
- **Module 06: GOSH Cloud** — Dedicated 20 GB MEGA storage with chunked upload progress, folder tree, streaming previews, and file management.
- **Module 07: GOSH Memories** — Shared photo albums, milestone timeline with monthly dividers, hashtags, favorite filter, and new memory modals.
- **Module 08: GOSH Diary** — Collaborative private journal with Web Crypto AES-256-GCM encryption, mood tags (`✨ Joyful`, `🌿 Peaceful`, etc.), date navigation, and zero plaintext storage.
- **Module 09: GOSH Together** — Shared calendar with countdown badges ("In X days", "Tomorrow", "Today"), collaborative to-do checklist with live check/uncheck status, and 50/50 shared expense split calculator.
- **Module 10: GOSH Music** — Curated shared playlists and streaming links (Spotify, YouTube, SoundCloud, Apple Music) with HTML5 audio playback and mini player HUD.
- **Module 11: GOSH Document Locker** — Categorized, client-encrypted document storage for passports, health records, and certificates.
- **Module 12: GOSH Smart Search** — Unified multi-module search engine indexing across Connect messages, cloud files, documents, memories, diary entries, calendar events, tasks, and vault items.
- **Module 13: GOSH Device Manager** — Active sessions, device fingerprinting, individual session revocation, and "Revoke All Other Devices" emergency killswitch.
- **Module 14: GOSH Recovery Center** — BIP-39 24-word emergency mnemonic generator/validator, encrypted JSON emergency recovery kit with SHA-256 integrity checksum, and Master Key rotation workflow.
- **Module 15: GOSH Settings & Profile** — Authorized user profile, auto-lock timeout preferences, dark mode styling, and session logout.

---

## Development Roadmap & Status (100% Complete)

- [x] **Phase 0:** Workspace Inspection & Zero-Cost Feasibility Report (Approved)
- [x] **Phase 1:** Foundation, Design Tokens, Responsive App Shell & SPA Router (Approved)
- [x] **Phase 2:** Authentication & Whitelist Integration (14/14 Tests Passed)
- [x] **Phase 3:** PostgreSQL Database Schema & Row Level Security Policies (16/16 Tests Passed)
- [x] **Phase 4:** Live Dashboard & Telemetry (18/18 Tests Passed)
- [x] **Phase 5:** GOSH Connect (Messaging & E2EE Crypto) (16/16 Tests Passed)
- [x] **Phase 6:** GOSH Cloud (MEGA Gateway Integration) (16/16 Tests Passed)
- [x] **Phase 7:** GOSH Vault & Document Locker (AES-256-GCM) (22/22 Tests Passed)
- [x] **Phase 8:** GOSH Calls (WebRTC & Screen Sharing) (35/35 Tests Passed)
- [x] **Phase 9:** Lifestyle Modules (Memories, Diary, Together, Music, Search) (47/47 Tests Passed)
- [x] **Phase 10:** Device Manager & Disaster Recovery Center (34/34 Tests Passed)
- [x] **Phase 11:** GitHub Pages Deployment & Capacitor Android Packaging (30/30 Tests Passed)
- [x] **Phase 12:** Dual-Device Comprehensive Verification & Full Platform Audit (37/37 Tests Passed)

**Total Automated Test Coverage: 269 Passing Assertions, 0 Failures.**

---

## Running the Automated Test Suites

```powershell
# Run the complete test suite across all 15 modules:
npm test
```

---

## Deployment & Running Locally

1. **Local Preview:**
   Simply serve the root directory using any local HTTP static server:
   ```powershell
   npx serve .
   ```
2. **GitHub Pages Deployment:**
   Pushing to `main` or `master` triggers `.github/workflows/deploy.yml` which deploys the static files directly to GitHub Pages with zero build step.
3. **Android Capacitor:**
   ```powershell
   npm install
   npx cap sync android
   npx cap open android
   ```
