# GOSH — Glimpse Of Soul Hearts 🌹

> **A Private Digital World for Love, Communication, Sharing Memories, and Staying Connected.**

GOSH is an ultra-premium, production-grade romantic social networking and private communication web application. Built with a modern full-stack architecture, GOSH bridges intimate connections with end-to-end WebRTC calling, real-time messaging, status updates, an encrypted shared Memory Vault powered by MEGA Cloud Storage, and Google SMTP security.

---

## 📸 Key Features

- **Application Entry Screen (WhatsApp-Inspired)**:
  - Atmospheric dark romantic illustration with constellation artwork.
  - Interactive Terms of Service & Privacy Policy acceptance modals.
  - High-converting, bottom-positioned green "Agree and Continue" button that records acceptance timestamps and version metadata.

- **Unified Multi-Identifier Authentication**:
  - Secure login using **Registered Mobile Number**, **Personal Username**, or **Email Address**.
  - Passwords authenticated securely via **Firebase Authentication**.
  - **Google OAuth Sign-In** with single-click profile synchronization.
  - **Google SMTP OTP Verification**: Real 6-digit cryptographic security codes dispatched directly to the user's Gmail using Google SMTP (`gosh81416@gmail.com`) for signups and password recovery.
  - Password strength calculation & match indicators.

- **Real-Time Messaging & Chat Sanctuary**:
  - Contact discovery via phone number, username, or email.
  - Real-time instant messaging using **Socket.io** and **Supabase Realtime**.
  - Message bubble glassmorphism, read receipts (single/double ticks), date separators.
  - Voice notes recorder powered by **MediaRecorder API** with audio waveform visualization.
  - Emoji picker, media sharing (photos, videos, documents), message quoting, reactions (❤️, 😍, 😘, 🔥, 🥺, 👍), and deletion.
  - Live typing indicator ("typing...") and online presence heartbeats.

- **Status / Updates (24-Hour Ephemeral Stories)**:
  - Text statuses with romantic gradient backgrounds and custom typography.
  - Photo and video status uploads with captions.
  - Full-screen interactive status viewer with automatic progress bars, pause on hold, tap-to-skip, viewer counts, and romantic quick replies.

- **WebRTC Audio & Video Calling**:
  - True peer-to-peer audio and video calls using the browser's native **WebRTC RTCPeerConnection**.
  - Real-time signaling managed via backend Socket.io.
  - Incoming call ringing modal with ringtone audio and Accept / Decline controls.
  - In-call controls: Mic mute/unmute, Camera toggle, Screen sharing, picture-in-picture video stream, and call duration counter.
  - Comprehensive call history log with one-click "Call Back" action.

- **Shared Memory Vault (MEGA Cloud Storage)**:
  - "Our Soul Sanctuary" — an encrypted shared media vault for couples.
  - Real streaming uploads directly into **MEGA Cloud Storage** via backend integration.
  - Date-wise timeline organization, photo/video/audio/document categorization, and custom albums (e.g., *First Date*, *Anniversary*, *Secret Love Letters*).
  - Feelings tags (*Heartfelt*, *Sweet Moment*, *Dreamy*, *Special Day*).
  - Full-screen lightbox preview and direct downloads.

- **Passcode Vault & Security**:
  - Secondary 4-digit PIN lock for sensitive private moments and memory spaces.
  - Screen sharing permission testing.
  - Complete profile customization (avatar, display name, handle, anniversary date, love bio).

---

## 🛠️ Technical Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide React, Socket.io-client, Canvas Confetti |
| **Backend** | Node.js (v24), Express.js, Socket.io, Multer, Bcrypt, Dotenv, CORS |
| **Database** | Supabase PostgreSQL & PostgREST (URL: `azwclorwxrzgofmribms.supabase.co`) |
| **Authentication** | Firebase Authentication (Email/Password, Google OAuth) |
| **Email Service** | Google SMTP with Gmail App Password (`gosh81416@gmail.com`) |
| **Cloud Storage** | MEGA Cloud Storage (`megajs` server-side integration) |
| **Realtime & Calling**| WebSockets (Socket.io) + WebRTC (RTCPeerConnection + Google STUN) |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18 (Tested on Node.js v24)
- npm >= 9

### 2. Installation
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration
The backend `.env` file is already pre-configured with the project's verified credentials:
```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://azwclorwxrzgofmribms.supabase.co
SUPABASE_KEY=sb_publishable_TzJoKCD-cPN6JLbgB_5K5g_H2nkq8YW

# Google SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gosh81416@gmail.com
SMTP_PASS=qpyu ryqr asmf wypm
SMTP_FROM="GOSH — Glimpse Of Soul Hearts" <gosh81416@gmail.com>

# MEGA Cloud Storage
MEGA_EMAIL=gosh81416@gmail.com
MEGA_PASSWORD=Gokul@709
```

### 4. Running the Application

#### Development Mode (Frontend & Backend)
```bash
# In terminal 1 (Backend API & Socket.io server):
npm run dev:backend

# In terminal 2 (Frontend Vite dev server with HMR on port 3000):
npm run dev:frontend
```

#### Production Mode
```bash
# Build the frontend
npm run build:frontend

# Start the full-stack server (serves API and bundled React frontend on port 5000)
npm run start:backend
```

Open your browser at `http://localhost:5000` (or `http://localhost:3000` in Vite dev mode).

---

## 🧪 Testing & Verification

Comprehensive automated test suites are included:

```bash
# Run backend API integration tests
cd backend
node --test tests/api.test.js

# Run Google SMTP OTP end-to-end verification test
node --test tests/otp.test.js

# Run MEGA Cloud Storage upload test
node --test tests/mega.test.js
```

All suites execute and verify live credentials and functionality.

---

## 📁 Project Structure

```
GOSH/
├── frontend/                     # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── assets/               # Brand assets & romantic vectors
│   │   ├── components/           # Reusable UI & Modals (Terms, Privacy)
│   │   ├── contexts/             # AuthContext (Firebase) & CallContext (WebRTC)
│   │   ├── layouts/              # DashboardLayout (Sidebar, Mobile Bar, Call HUD)
│   │   ├── pages/                # AgreeContinue, Login, Signup, Chats, Status, Calls, Vault, Settings, Accounts
│   │   ├── services/             # Firebase, Supabase, Socket.io, Backend API Client
│   │   ├── styles/               # Romantic Dark Design System & Tailwind CSS
│   │   ├── App.jsx               # Client Routing & Navigation Guards
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
├── backend/                      # Node.js + Express + Socket.io Server
│   ├── src/
│   │   ├── config/               # Env, Supabase, Google SMTP, MEGA Storage
│   │   ├── controllers/          # Auth, Users, Messages, Status, Vault, Calls, Settings
│   │   ├── middleware/           # Auth validation & error handling
│   │   ├── repositories/         # Supabase & resilient local data store
│   │   ├── routes/               # Modular Express API routes
│   │   ├── services/             # Google SMTP OTP, MEGA Cloud, WebRTC Realtime
│   │   └── server.js             # HTTP + Socket.io Master Server
│   ├── tests/                    # Automated integration & service tests
│   └── package.json
│
├── database/
│   └── migrations/               # 001_initial_schema.sql (PostgreSQL master schema)
├── docs/                         # Technical architecture documentation
├── .env.example
├── package.json
└── README.md
```

---

## 📚 Complete Project Documentation

For deep technical insights, schemas, security models, and deployment workflows, consult the dedicated guides:
- 🏛️ **[ARCHITECTURE.md](file:///e:/Projects/GOSH/ARCHITECTURE.md)** — High-level architecture, E2EE key exchange flow, WebRTC signaling diagrams, and resilience strategies.
- 🗄️ **[DATABASE_SCHEMA.md](file:///e:/Projects/GOSH/DATABASE_SCHEMA.md)** — Supabase PostgreSQL database tables, relationships, and Row Level Security (RLS) policies.
- 🛡️ **[SECURITY.md](file:///e:/Projects/GOSH/SECURITY.md)** — Zero-knowledge End-to-End Encryption (ECDH P-256 + AES-GCM), token security, and credential isolation.
- 🧪 **[TESTING.md](file:///e:/Projects/GOSH/TESTING.md)** — Automated test execution, manual verification procedures, and multi-device checklists.
- 🚀 **[DEPLOYMENT.md](file:///e:/Projects/GOSH/DEPLOYMENT.md)** — Zero-cost production deployment to GitHub Pages / Vercel, Render.com backend, and SSL setup.
- 📱 **[MOBILE_DEPLOYMENT.md](file:///e:/Projects/GOSH/MOBILE_DEPLOYMENT.md)** — Capacitor Android Studio APK generation, iOS packaging, and PWA installation.

---

## 🔒 Security & Privacy Notes

- Plain-text passwords are never stored in the database. Authentication is mediated through Firebase Authentication.
- All email OTPs are securely hashed using `bcrypt` and invalidated upon use or expiration.
- Real-time media uploaded to the Memory Vault is routed and stored directly in MEGA Cloud Storage without exposing cloud credentials to the client.
- WebRTC media streams are end-to-end encrypted peer-to-peer using DTLS-SRTP.
- 1-to-1 chat messaging is protected by native W3C Web Crypto End-to-End Encryption (ECDH P-256 + AES-256-GCM).

---

*GOSH (Glimpse Of Soul Hearts) — Crafted with love.*
