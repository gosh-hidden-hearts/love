/**
 * GOSH Hidden Hearts - End-to-End Encryption (E2EE) Service
 * Architecture:
 * - ECDH (P-256 / secp256r1) for peer-to-peer key agreement
 * - AES-256-GCM for authenticated payload encryption & decryption
 * - Web Crypto API (standard W3C native browser cryptography)
 * - Private keys are generated and preserved locally on this device only.
 */

import api from './api';

const sharedKeyCache = new Map(); // partnerId -> CryptoKey (AES-GCM)
let myKeyPair = null;

// Base64 helper utilities
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const encryptionService = {
  /**
   * Initializes or loads the current user's ECDH keypair.
   * Generates a new P-256 keypair if none exists on this device,
   * stores the private key locally, and publishes the public key to the server.
   */
  async initUserKeys(userId) {
    if (!userId || !window.crypto || !window.crypto.subtle) {
      console.warn('Web Crypto API not available in this environment');
      return null;
    }

    try {
      const privKeyKey = `gosh_e2ee_priv_${userId}`;
      const pubKeyKey = `gosh_e2ee_pub_${userId}`;

      const savedPrivJwk = localStorage.getItem(privKeyKey);
      const savedPubJwk = localStorage.getItem(pubKeyKey);

      if (savedPrivJwk && savedPubJwk) {
        try {
          const privateKey = await window.crypto.subtle.importKey(
            'jwk',
            JSON.parse(savedPrivJwk),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
          );

          const publicKey = await window.crypto.subtle.importKey(
            'jwk',
            JSON.parse(savedPubJwk),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            []
          );

          myKeyPair = { privateKey, publicKey, pubJwk: JSON.parse(savedPubJwk) };
          return myKeyPair;
        } catch (importErr) {
          console.warn('Failed to import existing keys, regenerating:', importErr);
        }
      }

      // Generate fresh ECDH keypair
      const keyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );

      const exportedPubJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
      const exportedPrivJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

      localStorage.setItem(pubKeyKey, JSON.stringify(exportedPubJwk));
      localStorage.setItem(privKeyKey, JSON.stringify(exportedPrivJwk));

      myKeyPair = {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        pubJwk: exportedPubJwk
      };

      // Publish public key to server
      await api.publishPublicKey(userId, JSON.stringify(exportedPubJwk));
      console.log('🔒 E2EE key pair initialized and public key registered for user:', userId);

      return myKeyPair;
    } catch (err) {
      console.error('Error initializing E2EE keys:', err);
      return null;
    }
  },

  /**
   * Derives a shared AES-256-GCM symmetric key using my private key and partner's public key.
   */
  async getSharedKey(partnerId) {
    if (sharedKeyCache.has(partnerId)) {
      return sharedKeyCache.get(partnerId);
    }

    if (!myKeyPair?.privateKey) {
      return null;
    }

    try {
      const res = await api.getPublicKey(partnerId);
      if (!res.publicKey) {
        return null;
      }

      const partnerPubJwk = typeof res.publicKey === 'string' ? JSON.parse(res.publicKey) : res.publicKey;
      const partnerPublicKey = await window.crypto.subtle.importKey(
        'jwk',
        partnerPubJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      const sharedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: partnerPublicKey
        },
        myKeyPair.privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt', 'decrypt']
      );

      sharedKeyCache.set(partnerId, sharedKey);
      return sharedKey;
    } catch (err) {
      console.warn('Could not derive E2EE shared key with partner', partnerId, err.message);
      return null;
    }
  },

  /**
   * Encrypts plaintext message content.
   * Returns a JSON string with { ciphertext, iv, isEncrypted: true },
   * or the original text if E2EE key derivation is not possible.
   */
  async encrypt(plainText, partnerId) {
    if (!plainText || !partnerId) return plainText;

    try {
      const sharedKey = await this.getSharedKey(partnerId);
      if (!sharedKey) {
        return plainText; // Fallback to plaintext if keys unavailable
      }

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(plainText);

      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        sharedKey,
        encoded
      );

      const payload = {
        ciphertext: arrayBufferToBase64(ciphertextBuffer),
        iv: arrayBufferToBase64(iv),
        isEncrypted: true
      };

      return JSON.stringify(payload);
    } catch (err) {
      console.warn('E2EE Encryption failed, using plaintext:', err);
      return plainText;
    }
  },

  /**
   * Decrypts an encrypted message payload.
   * If the content is not encrypted JSON, returns the content directly.
   */
  async decrypt(rawContent, senderId) {
    if (!rawContent || typeof rawContent !== 'string') return rawContent;

    // Check if content looks like encrypted JSON
    if (!rawContent.startsWith('{"ciphertext"') && !rawContent.includes('"isEncrypted":true')) {
      return rawContent;
    }

    try {
      const parsed = JSON.parse(rawContent);
      if (!parsed.isEncrypted || !parsed.ciphertext || !parsed.iv) {
        return rawContent;
      }

      const sharedKey = await this.getSharedKey(senderId);
      if (!sharedKey) {
        return '🔒 [Encrypted Message - Key not found]';
      }

      const ciphertext = base64ToArrayBuffer(parsed.ciphertext);
      const iv = new Uint8Array(base64ToArrayBuffer(parsed.iv));

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        sharedKey,
        ciphertext
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      console.warn('E2EE Decryption failed:', err);
      return '🔒 [Encrypted Message]';
    }
  }
};

export default encryptionService;
