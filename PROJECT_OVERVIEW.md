# GOSH — PROJECT OVERVIEW
**Tagline:** Your Space. Your Stories.  
**Platform Concept:** Private Digital Platform for Exactly Two Authorized Users  
**Target Environments:** Modern Desktop Browsers, Mobile Browsers, Android App (Capacitor)

---

## 1. Vision & Identity

GOSH is an exclusive, private ecosystem designed to give two authorized people a secure sanctuary for their digital lives. Unlike fragmented commercial consumer tools that track telemetry, display advertisements, or expose data to public internet feeds, GOSH is:
- **Discreet & Professional:** Modern charcoal, graphite, subtle violet, and champagne aesthetics. No cheesy hearts, no public announcements, no exposed identities.
- **Unified:** Replaces 10 different separate apps (WhatsApp/Signal, Google Drive, 1Password, Google Photos, Shared Notes, Calendar, Splitwise, Spotify links) with a single, private, shared experience.
- **Zero-Cost Sovereign Infrastructure:** 100% free-tier architecture utilizing GitHub Pages, Firebase Auth, Supabase PostgreSQL, MEGA, and WebRTC.

---

## 2. Shared Data Architecture

Every piece of application data inside GOSH is shared symmetrically between User 1 and User 2:
- Both users can see and contribute to conversations, files, passwords, albums, notes, calendar events, and expenses.
- No "admin-only" superiority: both accounts have equal standard operating permissions.
- Critical operations (rotating vault encryption keys, wiping files, or revoking device sessions) require confirmation.

---

## 3. Technology Matrix

| Role | Technology | Justification |
|---|---|---|
| Frontend Presentation | HTML5, CSS3, Vanilla JS (ES Modules) | Zero build step, long-term maintainability, instant deploy to GitHub Pages. |
| Hosting | GitHub Pages | Zero cost, global high-speed CDN, automated GitHub action deploys. |
| Identity & OTP | Firebase Authentication | Free tier (50k MAU), rock-solid token generation, Email OTP support. |
| Database & RLS | Supabase PostgreSQL | Free tier (500 MB DB), rock-solid Row Level Security, instant real-time websockets. |
| File Storage | MEGA | 20 GB free tier, genuine large file storage without paying cloud bucket fees. |
| Voice/Video Calls | WebRTC (P2P + Google STUN) | Direct peer-to-peer audio/video/screen share, zero latency, zero server costs. |
| Android Shell | Capacitor | Standard web WebView wrapper, hardware access, push notifications. |
| Encryption | Web Crypto API | Standard W3C AES-256-GCM, hardware accelerated on modern devices. |
