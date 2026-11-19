/**
 * GOSH ZERO-KNOWLEDGE VAULT SERVICE (PHASE 7)
 * AES-256-GCM Credential Management, Auto-Lock, and Secure Password Generation.
 */

import { Crypto } from './crypto.service.js';
import { DB } from './db.service.js';
import { Auth } from './auth.service.js';
import { State } from '../state.js';
import { Toast } from '../components/toast.js';

class VaultService {
  constructor() {
    this.masterKey = null; // Stored exclusively in volatile memory while unlocked
    this.isUnlocked = false;
    this.autoLockMinutes = 5;
    this.inactivityTimer = null;
    this.saltKey = 'gosh_vault_salt';
    this.verificationHashKey = 'gosh_vault_verifier';

    this.initSalt();
    this.initActivityTracker();
  }

  // 1. SALT & VERIFICATION INITIALIZATION
  initSalt() {
    let saltHex = localStorage.getItem(this.saltKey);
    if (!saltHex) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(this.saltKey, saltHex);
    }
    this.salt = Crypto.hexToBuffer(saltHex);
  }

  // 2. UNLOCK VAULT VIA MASTER PASSPHRASE
  async unlockVault(passphrase) {
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters long.');
    }

    // Derive Master Encryption Key via PBKDF2-HMAC-SHA256 (100,000 iterations)
    const derivedKey = await Crypto.deriveKey(passphrase, new Uint8Array(this.salt), 100000);

    // Verify passphrase correctness via verification hash
    const storedVerifier = localStorage.getItem(this.verificationHashKey);
    const testCheck = await this.computeVerifier(passphrase);

    if (storedVerifier && storedVerifier !== testCheck) {
      throw new Error('Incorrect Master Passphrase. Decryption rejected.');
    }

    if (!storedVerifier) {
      // First time vault setup: establish verifier hash
      localStorage.setItem(this.verificationHashKey, testCheck);
    }

    this.masterKey = derivedKey;
    this.isUnlocked = true;
    State.set('isVaultUnlocked', true);

    this.resetInactivityTimer();
    Toast.success('Vault Unlocked', 'AES-256-GCM zero-knowledge session active.');
    return true;
  }

  // 3. LOCK VAULT & PURGE MEMORY KEYS
  lockVault() {
    this.masterKey = null;
    this.isUnlocked = false;
    State.set('isVaultUnlocked', false);

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    Toast.warning('Vault Locked', 'Master decryption keys purged from memory.');
  }

  // 4. AUTO-LOCK INACTIVITY MANAGEMENT
  initActivityTracker() {
    const reset = () => {
      if (this.isUnlocked) this.resetInactivityTimer();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', reset, { passive: true });
      window.addEventListener('keydown', reset, { passive: true });
      window.addEventListener('touchstart', reset, { passive: true });
      window.addEventListener('blur', () => {
        // If configured for immediate blur lock
        if (this.autoLockMinutes === 0 && this.isUnlocked) {
          this.lockVault();
        }
      });
    }
  }

  resetInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.autoLockMinutes > 0) {
      this.inactivityTimer = setTimeout(() => {
        if (this.isUnlocked) {
          console.log('[GOSH VAULT] Inactivity timeout reached. Locking vault.');
          this.lockVault();
          window.AppRouter?.handleRouting();
        }
      }, this.autoLockMinutes * 60 * 1000);
    }
  }

  // 5. ENCRYPT & INSERT VAULT ITEM
  async addItem({ title, category = 'login', username = '', password = '', url = '', notes = '', favorite = false }) {
    this.assertUnlocked();
    const currentUser = Auth.getCurrentUser();

    // Sensitive payload to be encrypted
    const payload = JSON.stringify({
      username: username.trim(),
      password,
      url: url.trim(),
      notes: notes.trim()
    });

    const encrypted = await Crypto.encrypt(payload, this.masterKey);

    const itemRecord = await DB.insert('vault_items', {
      title: title.trim(),
      category,
      data_encrypted: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: 'aes_gcm_auth_tag',
      favorite: Boolean(favorite),
      created_by: currentUser.id
    });

    Toast.success('Item Secured', `"${title}" encrypted with AES-256-GCM.`);
    return itemRecord;
  }

  // 6. QUERY & DECRYPT VAULT ITEMS
  async getDecryptedItems(filterFn = null) {
    this.assertUnlocked();
    const rawItems = await DB.query('vault_items', filterFn, (a, b) => new Date(b.created_at) - new Date(a.created_at));

    return await Promise.all(rawItems.map(async item => {
      try {
        const decryptedJson = await Crypto.decrypt(item.data_encrypted, item.iv, this.masterKey);
        const data = JSON.parse(decryptedJson);
        return {
          id: item.id,
          title: item.title,
          category: item.category,
          favorite: item.favorite,
          created_at: item.created_at,
          updated_at: item.updated_at,
          ...data
        };
      } catch (err) {
        return {
          id: item.id,
          title: item.title,
          category: item.category,
          favorite: item.favorite,
          username: '[Decryption Error]',
          password: '',
          url: '',
          notes: ''
        };
      }
    }));
  }

  // 7. UPDATE VAULT ITEM
  async updateItem(id, updates) {
    this.assertUnlocked();
    const existing = await DB.getById('vault_items', id);
    if (!existing) throw new Error('Vault item not found.');

    const decryptedJson = await Crypto.decrypt(existing.data_encrypted, existing.iv, this.masterKey);
    const existingData = JSON.parse(decryptedJson);

    const mergedData = {
      username: updates.username !== undefined ? updates.username : existingData.username,
      password: updates.password !== undefined ? updates.password : existingData.password,
      url: updates.url !== undefined ? updates.url : existingData.url,
      notes: updates.notes !== undefined ? updates.notes : existingData.notes
    };

    const encrypted = await Crypto.encrypt(JSON.stringify(mergedData), this.masterKey);

    const updated = await DB.update('vault_items', id, {
      title: updates.title !== undefined ? updates.title : existing.title,
      category: updates.category !== undefined ? updates.category : existing.category,
      favorite: updates.favorite !== undefined ? updates.favorite : existing.favorite,
      data_encrypted: encrypted.ciphertext,
      iv: encrypted.iv
    });

    Toast.info('Item Updated', `"${updated.title}" updated securely.`);
    return updated;
  }

  // 8. DELETE VAULT ITEM
  async deleteItem(id) {
    this.assertUnlocked();
    await DB.delete('vault_items', id);
    Toast.info('Item Removed', 'Credential permanently deleted.');
    return { success: true };
  }

  // 9. CRYPTOGRAPHICALLY SECURE PASSWORD GENERATOR
  generatePassword({ length = 16, uppercase = true, lowercase = true, numbers = true, symbols = true } = {}) {
    const charsUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charsLower = 'abcdefghijklmnopqrstuvwxyz';
    const charsNumbers = '0123456789';
    const charsSymbols = '!@#$%^&*()_+~|}{[]:;?><,.-=';

    let pool = '';
    if (uppercase) pool += charsUpper;
    if (lowercase) pool += charsLower;
    if (numbers) pool += charsNumbers;
    if (symbols) pool += charsSymbols;

    if (!pool) pool = charsLower + charsNumbers;

    const randomBuffer = new Uint32Array(length);
    crypto.getRandomValues(randomBuffer);

    let password = '';
    for (let i = 0; i < length; i++) {
      password += pool[randomBuffer[i] % pool.length];
    }
    return password;
  }

  // 10. PASSWORD STRENGTH METER
  calculateStrength(password) {
    if (!password) return { score: 0, label: 'Empty', color: 'var(--text-subtle)' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 14) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Very Weak', color: 'var(--color-danger)' };
    if (score === 2) return { score: 2, label: 'Weak', color: 'var(--color-warning)' };
    if (score === 3) return { score: 3, label: 'Moderate', color: 'var(--color-info)' };
    if (score === 4) return { score: 4, label: 'Strong', color: 'var(--color-success)' };
    return { score: 5, label: 'Very Strong', color: 'var(--color-success)' };
  }

  // 11. SECURE CLIPBOARD COPY
  async copyToClipboard(text, label = 'Secret') {
    try {
      await navigator.clipboard.writeText(text);
      Toast.success('Copied to Clipboard', `${label} copied. Clears in 30s.`);
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {}
      }, 30000);
    } catch {
      Toast.info('Copy Failed', 'Please copy manually.');
    }
  }

  assertUnlocked() {
    if (!this.isUnlocked || !this.masterKey) {
      throw new Error('Vault is locked. Master passphrase required.');
    }
  }

  async computeVerifier(passphrase) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase + 'GOSH_VAULT_VERIFIER_SALT');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const Vault = new VaultService();
