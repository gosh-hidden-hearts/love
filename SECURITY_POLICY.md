# GOSH — SECURITY POLICY & THREAT MODEL

---

## 1. Zero-Trust Security Policy

1. **Least Privilege & No Secrets on Client:**
   - Frontend web code holds **ZERO** administrative tokens or database service-role secrets.
   - Master MEGA credentials reside exclusively inside server-side Supabase Edge Secrets.
2. **Strict Whitelist & Defense-in-Depth:**
   - Client UI omits registration controls.
   - Firebase Auth rejects unauthorized accounts.
   - Supabase Edge Function rejects tokens not matching the 2 whitelisted email addresses.
   - PostgreSQL Row Level Security enforces that `auth.uid()` belongs to `authorized_users`.
3. **Zero-Knowledge Encryption:**
   - Passwords, secure notes, diary entries, and confidential documents are encrypted on the client device before network transit.
   - Supabase and MEGA servers only store encrypted ciphertext, nonces, and authentication tags.

---

## 2. Threat Vector Mitigation Table

| Threat Vector | Severity | Mitigation Strategy |
|---|---|---|
| **Public URL Discovery** | HIGH | Obscure branding; unauthenticated users see only a discreet, minimal login card. No self-registration. |
| **Database Breach** | CRITICAL | Supabase RLS isolates data; sensitive columns contain client-side AES-256-GCM ciphertext unreadable without user passphrases. |
| **Session Hijacking** | HIGH | HTTPS enforced; short-lived access tokens; remote revocation capable. |
| **Brute Force Attacks** | HIGH | Exponential rate-limiting handled natively by Firebase Auth. |
| **Data Loss / Ransomware** | CRITICAL | Exportable 24-word emergency mnemonic recovery kit and offline encrypted JSON backups. |
