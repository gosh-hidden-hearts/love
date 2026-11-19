/**
 * GOSH CLIENT STATE MANAGEMENT
 * Lightweight, reactive, zero external dependencies.
 */

class StateStore {
  constructor() {
    this.state = {
      user: null,               // { email, displayName, uid, avatarUrl }
      sessionToken: null,       // Supabase Session JWT
      isVaultUnlocked: false,   // Master vault status
      activeRoute: 'home',      // Current view
      onlineStatus: navigator.onLine,
      peerOnline: false,        // Is the second user active
      unreadCounts: {
        connect: 0,
        calls: 0,
        notifications: 0
      },
      storageUsage: {
        usedBytes: 104857600,   // ~100MB initial
        totalBytes: 21474836480 // 20GB MEGA free tier
      }
    };
    this.listeners = new Map();
    this.initNetworkListeners();
  }

  initNetworkListeners() {
    window.addEventListener('online', () => this.set('onlineStatus', true));
    window.addEventListener('offline', () => this.set('onlineStatus', false));
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    this.notify(key, value, oldValue);
  }

  update(key, partial) {
    if (typeof this.state[key] === 'object' && this.state[key] !== null) {
      this.set(key, { ...this.state[key], ...partial });
    } else {
      this.set(key, partial);
    }
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Immediate callback with current value
    callback(this.state[key]);

    // Return unsubscribe function
    return () => {
      const subs = this.listeners.get(key);
      if (subs) subs.delete(callback);
    };
  }

  notify(key, newValue, oldValue) {
    const subs = this.listeners.get(key);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (err) {
          console.error(`Error in state listener for "${key}":`, err);
        }
      });
    }
  }
}

export const State = new StateStore();
