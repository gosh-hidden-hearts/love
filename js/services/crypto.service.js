/**
 * GOSH CRYPTOGRAPHIC ENGINE (WEB CRYPTO API)
 * W3C Standard AES-256-GCM & PBKDF2-HMAC-SHA256 Implementation
 */

class CryptoService {
  constructor() {
    this.cachedKey = null;
    this.defaultSalt = new Uint8Array([71, 79, 83, 72, 95, 83, 65, 76, 84, 95, 50, 48, 50, 54, 33, 35]); // "GOSH_SALT_2026!#"
  }

  // 1. KEY DERIVATION (PBKDF2-HMAC-SHA256)
  async deriveKey(passphrase, salt = this.defaultSalt, iterations = 100000) {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey', 'deriveBits']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      passphraseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.cachedKey = derivedKey;
    return derivedKey;
  }

  // 2. ENCRYPT TEXT PAYLOAD (AES-256-GCM with unique 96-bit IV)
  async encrypt(plaintext, key = this.cachedKey) {
    if (!key) {
      // Default to ecosystem master key if vault unlocked, or derive from device key
      key = await this.getOrCreateDefaultKey();
    }

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit unique IV

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encodedData
    );

    return {
      ciphertext: this.bufferToHex(ciphertextBuffer),
      iv: this.bufferToHex(iv)
    };
  }

  // 3. DECRYPT TEXT PAYLOAD (AES-256-GCM)
  async decrypt(ciphertextHex, ivHex, key = this.cachedKey) {
    if (!key) {
      key = await this.getOrCreateDefaultKey();
    }

    try {
      const ciphertextBuffer = this.hexToBuffer(ciphertextHex);
      const ivBuffer = this.hexToBuffer(ivHex);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer
        },
        key,
        ciphertextBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (err) {
      console.warn('[GOSH CRYPTO] Decryption failed or authentication tag mismatch:', err);
      return '[Encrypted Content - Decryption Failed]';
    }
  }

  // Default shared channel key (for transparent chat & shared notes)
  async getOrCreateDefaultKey() {
    if (!this.cachedKey) {
      // Shared standard seed key for active GOSH ecosystem room
      this.cachedKey = await this.deriveKey('GOSH_SHARED_ECOSYSTEM_SECRET_KEY');
    }
    return this.cachedKey;
  }

  // UTILITIES: Hex <-> ArrayBuffer
  bufferToHex(buffer) {
    const uint8 = new Uint8Array(buffer);
    return Array.from(uint8).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  hexToBuffer(hexString) {
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes.buffer;
  }
}

export const Crypto = new CryptoService();
