# GOSH (Hidden Hearts) — Production Deployment & Service Integration Guide

---

## 1. Production Architecture Overview

GOSH is split into a **Static Progressive Web App Frontend** and a **Secure Node.js Realtime Backend**:

```
+-----------------------------------------------------------------------------------------+
|                                    USER BROWSER / PWA                                   |
|                                                                                         |
|                       +---------------------------------------+                         |
|                       |  HTTPS (GitHub Pages & Render SSL)    |                         |
|                       +---------------------------------------+                         |
|                                           |                                             |
|                     +---------------------+---------------------+                       |
|                     |                                           |                       |
|                     v                                           v                       |
|       +---------------------------+               +---------------------------+         |
|       |     FRONTEND PWA          |               |     BACKEND SERVICE       |         |
|       |  (GitHub Pages - /love/)  |               |  (Render.com / Railway)   |         |
|       |  - React 18 SPA + Vite    |               |  - Express REST APIs      |         |
|       |  - PWA Manifest + SW      |               |  - Socket.io WebSockets   |         |
|       |  - Firebase Auth Client   |               |  - Google SMTP Transporter|         |
|       |  - Supabase Client        |               |  - MEGA Cloud Encrypted   |         |
|       |  - E2EE Web Crypto P-256  |               |  - JWT Auth + Passwords   |         |
|       +---------------------------+               +---------------------------+         |
|                                                                 |                       |
|                                     +---------------------------+                       |
|                                     |                                                   |
|                                     v                                                   |
|       +---------------------------------------------------------------+                 |
|       |                 SECURE DATA & CLOUD SERVICES                  |                 |
|       |                                                               |                 |
|       |  1. Supabase PostgreSQL (Database + Realtime Presence)        |                 |
|       |  2. MEGA Cloud Storage (20GB Encrypted Memory Vault)          |                 |
|       |  3. Google SMTP (Gmail App Password, Port 587 OTP Service)    |                 |
|       |  4. Firebase Auth (Google OAuth & Email/Password Identity)    |                 |
|       |  5. Google STUN (WebRTC Peer-to-Peer Calling)                 |                 |
|       +---------------------------------------------------------------+                 |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Frontend Deployment (GitHub Pages)

The frontend is live at:
**https://gosh-hidden-hearts.github.io/love/**

### GitHub Actions Deployment Workflow (`.github/workflows/deploy.yml`)
When code is pushed to `main`, GitHub Actions:
1. Installs dependencies in `frontend/`.
2. Injects build-time environment variables (`VITE_BASE_PATH=/love/`, `VITE_API_URL`, etc.).
3. Runs `npm run build`.
4. Deploys `frontend/dist` to GitHub Pages.

---

## 3. Backend Deployment (Render.com Free Tier)

GitHub Pages hosts **only static files** (HTML, CSS, JS). A Node.js backend is required for:
- Google SMTP email OTP dispatch (browsers cannot open raw TCP sockets to SMTP ports).
- MEGA Cloud storage uploads (requires server-side encrypted streams and secure credentials).
- Socket.io WebSockets for real-time messaging and WebRTC calling signaling.

### Option A: 1-Click Blueprint Deploy (Recommended)
1. Go to [Render.com](https://render.com) and sign in.
2. Click **New +** → **Blueprint**.
3. Select your GitHub repository (`GOSH`).
4. Render will read `render.yaml` automatically and configure the `gosh-backend` web service.
5. In the Render Dashboard, fill in your private secrets:
   - `SMTP_PASS`: Your 16-character Google App Password (e.g. `qpyu ryqr asmf wypm`).
   - `MEGA_PASSWORD`: Your MEGA account password (e.g. `Gokul@709`).
6. Click **Apply**. Once deployed, Render will provide a live URL like:
   `https://gosh-backend.onrender.com`

### Option B: Manual Web Service Deploy
1. Click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure:
   - **Name**: `gosh-backend`
   - **Region**: Oregon (or Singapore / Frankfurt)
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add the environment variables listed in Section 4.

---

## 4. Production Environment Variables Checklist

### Backend Environment Variables (Set in Render Dashboard)
```env
PORT=10000
NODE_ENV=production

# Supabase PostgreSQL Database
SUPABASE_URL=https://azwclorwxrzgofmribms.supabase.co
SUPABASE_KEY=sb_publishable_TzJoKCD-cPN6JLbgB_5K5g_H2nkq8YW

# Google SMTP Credentials (Port 587)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gosh81416@gmail.com
SMTP_PASS=qpyu ryqr asmf wypm
SMTP_FROM="GOSH Sanctuary" <gosh81416@gmail.com>

# MEGA Cloud Storage (20GB Free Encrypted Media Vault)
MEGA_EMAIL=gosh81416@gmail.com
MEGA_PASSWORD=Gokul@709

# Security
JWT_SECRET=gosh_ultra_max_romantic_secret_key_2026
OTP_EXPIRY_MINUTES=10
```

### Connecting the Frontend to the Backend
Once your backend is deployed (e.g. `https://gosh-backend.onrender.com`):

**Method 1: Live in Website Settings (Instant, No Rebuild Needed)**
1. Open https://gosh-hidden-hearts.github.io/love/
2. Log in or go to **Settings** → **Backend Server & Cloud Services**.
3. Paste your backend URL (`https://gosh-backend.onrender.com`).
4. Click **Test & Connect**. The green checkmark confirms live connectivity for Supabase, Google SMTP, and MEGA Cloud!

**Method 2: Via GitHub Secrets (Automated on every push)**
1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**:
   - Name: `VITE_API_URL`
   - Value: `https://gosh-backend.onrender.com`
3. Click **New repository secret**:
   - Name: `VITE_SOCKET_URL`
   - Value: `https://gosh-backend.onrender.com`
4. Re-run the deployment workflow in the **Actions** tab.

---

## 5. Firebase & Supabase Manual Setup

### Firebase Console (Required for Google Sign-In on GitHub Pages)
1. Open the [Firebase Console](https://console.firebase.google.com/) → project `gosh-81416`.
2. Go to **Authentication** → **Settings** → **Authorized domains**.
3. Click **Add domain** and enter:
   ```text
   gosh-hidden-hearts.github.io
   ```
4. Click **Save**.

### Supabase SQL Editor (Required for PostgreSQL Database & RLS)
1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/azwclorwxrzgofmribms/sql).
2. Go to the **SQL Editor** tab.
3. Run the schema creation script from `database/migrations/001_initial_schema.sql`.
4. Run the Row Level Security (RLS) policies script from `database/policies/002_rls_policies.sql`.
5. Verify that tables (`users`, `user_profiles`, `messages`, `memory_files`, etc.) appear under **Table Editor**.
