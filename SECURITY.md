# GOSH (Hidden Hearts) — Security & Cryptographic Model

---

## 1. Security Principles

Security in GOSH is a core architectural requirement, not an afterthought. The platform is designed with zero-trust principles:
1. **Zero Credential Exposure**: Private keys, database service keys, MEGA credentials, and SMTP passwords never enter client bundles or public repositories.
2. **End-to-End Encryption (E2EE)**: Direct 1-to-1 messages are encrypted on the sender's device before leaving the browser. The server and database only store ciphertext.
3. **Defense in Depth**: Client checks are backed by server-side JWT authentication, Supabase Row Level Security (RLS), and parameterized queries.

---

## 2. End-to-End Encryption (E2EE) Implementation

### 2.1 Cryptographic Algorithms
GOSH uses standard, peer-reviewed W3C standard cryptographic primitives via the native browser **Web Crypto API** (`window.crypto.subtle`):
- **Key Agreement**: **ECDH (Elliptic Curve Diffie-Hellman)** over **NIST P-256** (`secp256r1`).
- **Symmetric Cipher**: **AES-256-GCM** (Galois/Counter Mode).
- **Initialization Vector (IV)**: 12-byte (96-bit) cryptographically secure pseudorandom values generated per message via `crypto.getRandomValues()`.
- **Integrity & Authentication**: 128-bit GCM authentication tag automatically verified during decryption.

### 2.2 Key Lifecycle
1. **Key Generation**: Upon first login, each client generates an ECDH P-256 keypair in the browser.
2. **Private Key Storage**: The private key is exported to JWK format and stored exclusively in client-side storage (`localStorage` / IndexedDB). It is never sent to the network.
3. **Public Key Publication**: The public key is exported as JWK and transmitted to `POST /api/users/public-key`.
4. **Shared Secret Derivation**: When chatting with a partner, the client queries `GET /api/users/:partnerId/public-key` and computes the shared AES-256 key using native `subtle.deriveKey`.
5. **Key Caching**: Derived keys are cached in-memory (`sharedKeyCache`) during the session for zero-latency performance.

---

## 3. WebRTC Peer-to-Peer Security

- **Signaling**: Authenticated via Socket.io session handshakes.
- **Media Streams**: WebRTC audio and video streams travel directly between peers using **DTLS (Datagram Transport Layer Security)** and **SRTP (Secure Real-time Transport Protocol)**.
- **Relay Limitations**: The default configuration uses Google STUN (`stun.l.google.com:19302`). For symmetric NAT networks requiring a TURN relay, only free STUN/TURN configurations or documented relay proxies are utilized without incurring cloud expenses.

---

## 4. Authentication & Session Security

- **Dual-Token System**:
  - Firebase Authentication generates verified user credentials (ID token / UID).
  - Backend issues an HMAC SHA-256 signed JWT (`Authorization: Bearer <token>`) with a secure expiry.
- **Multi-Identifier Discovery Without Leakage**:
  - User search endpoints (`/api/users/search?q=...`) return only necessary public fields (`id`, `username`, `display_name`, `avatar_url`, `online_status`).
  - Full email and phone number databases are never returned or indexed publicly.

---

## 5. Passcode Vault Cryptography

- The secondary 4-digit PIN lock for private albums and sensitive chats is hashed using **SHA-256** on the backend before persistence.
- Client verification passes the entered PIN to `POST /api/settings/:userId/verify-passcode` which performs constant-time hash comparison, ensuring plaintext PINs are never stored.

---

## 6. Cloud Storage Security (MEGA)

- The server acts as a secure streaming proxy (`megajs`).
- The client receives only authorized download handles or authenticated proxy streams.
- MEGA master account credentials (`MEGA_EMAIL`, `MEGA_PASSWORD`) remain server-side in `backend/.env`.

---

## 7. Rate Limiting & Input Sanitization

- Express backend applies JSON body size limits (50MB maximum for media attachments).
- Multer disk and memory storages enforce strict file extension and MIME type validation.
- Database access uses Supabase PostgREST parameterized queries, preventing SQL injection vulnerabilities.
