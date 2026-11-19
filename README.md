# GOSH — Your Space. Your Stories.
### Complete Private Digital Platform | Website + Android Application

GOSH is a centralized, secure, private digital ecosystem engineered for exactly two authorized users. It unites end-to-end encrypted messaging, WebRTC audio/video calling, dedicated 20 GB MEGA cloud storage, a zero-knowledge password vault, a shared life journal, calendar, document locker, and device security management into a unified web and Android platform.

---

## Key Principles & Pillars

1. **Security & Privacy First:** Zero-knowledge architecture. Sensitive credentials, diary notes, and confidential documents are encrypted client-side using the Web Crypto API (`AES-256-GCM` with `PBKDF2-HMAC-SHA256`).
2. **Strict Two-User Access Control:** No public registration, no guest accounts, no demo credentials.
3. **Verified Zero-Cost Infrastructure:** Powered exclusively by free tiers:
   - **Frontend:** Pure HTML5 / CSS3 / Vanilla JavaScript on GitHub Pages ($0).
   - **Identity:** Firebase Authentication ($0).
   - **Database & Realtime:** Supabase PostgreSQL with Row Level Security ($0).
   - **Storage:** Dedicated MEGA cloud account ($0 / 20 GB).
   - **Calling:** Peer-to-Peer WebRTC over Google STUN ($0).
   - **Android Packaging:** Open-source Capacitor ($0).
4. **No Build Step / No Compilation for Web:** Vanilla ES Modules architecture deployable directly to static hosting.

---

## 15 Integrated Modules

- **Module 01: GOSH Authentication & Identity** — Two-account whitelist, Email OTP verification, device trust.
- **Module 02: GOSH Home Dashboard** — Storage telemetry, quick hubs, activity feeds, security status.
- **Module 03: GOSH Connect** — Real-time private chat, media attachments, voice notes, message reactions.
- **Module 04: GOSH Calls** — P2P WebRTC audio, video calling, and bidirectional screen sharing.
- **Module 05: GOSH Vault** — Zero-knowledge password manager, AES-256-GCM encryption, auto-lock.
- **Module 06: GOSH Cloud** — 20 GB dedicated MEGA storage with folder management and streaming previews.
- **Module 07: GOSH Memories** — Shared photo albums, milestone timeline, favorites.
- **Module 08: GOSH Diary** — Collaborative private journal with mood tags and encrypted notes.
- **Module 09: GOSH Together** — Shared calendar, to-do checklists, countdowns, and expense planner.
- **Module 10: GOSH Music** — Curated shared playlists and legitimate streaming links (YouTube/Spotify).
- **Module 11: GOSH Document Locker** — Categorized, client-encrypted document storage for PDFs and certificates.
- **Module 12: GOSH Smart Search** — Unified index search across all modules.
- **Module 13: GOSH Device Manager** — Active sessions, device fingerprinting, and remote session revocation.
- **Module 14: GOSH Recovery Center** — 24-word emergency mnemonic recovery kit and key rotation.
- **Module 15: GOSH Settings & Profile** — Customization, auto-lock timeouts, session controls.

---

## Development Roadmap & Status

- [x] **Phase 0:** Workspace Inspection & Zero-Cost Feasibility Report (Approved)
- [x] **Phase 1:** Foundation, Design Tokens, Responsive App Shell & SPA Router
- [ ] **Phase 2:** Authentication & Whitelist Integration (Firebase + Supabase Bridge)
- [ ] **Phase 3:** PostgreSQL Database Schema & Row Level Security Policies
- [ ] **Phase 4:** Live Dashboard & Telemetry
- [ ] **Phase 5:** GOSH Connect (Messaging & Supabase Realtime)
- [ ] **Phase 6:** GOSH Cloud (MEGA Gateway Integration)
- [ ] **Phase 7:** GOSH Vault & Document Locker (Web Crypto AES-256-GCM)
- [ ] **Phase 8:** GOSH Calls (WebRTC & Screen Sharing)
- [ ] **Phase 9:** Lifestyle Modules (Memories, Diary, Together, Music, Smart Search)
- [ ] **Phase 10:** Device Manager & Disaster Recovery Center
- [ ] **Phase 11:** GitHub Pages Deployment & Capacitor Android Packaging
- [ ] **Phase 12:** Dual-Device Comprehensive Verification & QA

---

## Running Locally

To serve the web application locally without build tools:

```powershell
# Using Python
python -m http.server 8000

# OR using Node.js npx serve
npx serve . -p 8000
```

Then open `http://localhost:8000` in your web browser.
