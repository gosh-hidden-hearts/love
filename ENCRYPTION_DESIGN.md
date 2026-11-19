# GOSH — CRYPTOGRAPHIC & ENCRYPTION DESIGN
**Standard:** Web Cryptography API (W3C Standard)  
**Symmetric Cipher:** AES-256-GCM (Galois/Counter Mode)  
**Key Derivation:** PBKDF2-HMAC-SHA256 (600,000 iterations)

---

## 1. Cryptographic Architecture

```
User Master Passphrase
         │
         ▼
[PBKDF2-HMAC-SHA256] ── Salt (128-bit cryptographically secure random)
  (600,000 iterations)
         │
         ▼
[Master Encryption Key (MEK)] ── 256-bit AES-GCM Key (Volatile JS Memory Only)
         │
         ├──► Encrypt Vault Passwords (AES-256-GCM + 96-bit unique IV)
         ├──► Encrypt Diary Entries (AES-256-GCM + 96-bit unique IV)
         ├──► Encrypt Confidential Documents (AES-256-GCM + 96-bit unique IV)
         └──► Encrypted Backup Payload (Exportable Recovery Package)
```

---

## 2. Cryptographic Rules

1. **Unique Nonce (IV):** Every encryption call generates a fresh, cryptographically secure 96-bit initialization vector using `crypto.getRandomValues(new Uint8Array(12))`. An IV is NEVER reused with the same key.
2. **Authenticated Tag:** AES-GCM generates a 128-bit authentication tag that verifies ciphertext integrity and prevents tampering.
3. **Memory Hygiene:**
   - Keys are held in volatile memory only while unlocked.
   - On tab close, page unload, or auto-lock timeout (1–5 min), the key reference is discarded.
   - Plaintext passwords and notes are never cached in `localStorage` or `sessionStorage`.

---

## 3. Disaster Recovery Design

- **Emergency Recovery Kit:** An exportable offline backup file containing:
  - Salt (hex)
  - Key derivation parameters (iterations, algorithm)
  - Recovery verification hash
  - Encrypted master payload
- **BIP-39 Mnemonic Phrase:** Option to represent the master secret as a 24-word paper recovery mnemonic.
