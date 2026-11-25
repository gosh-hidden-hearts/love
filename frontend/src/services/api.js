import { auth } from './firebase';

/**
 * GOSH Hidden Hearts - API Service Client
 * - Resolves backend URL from VITE_API_URL / VITE_API_BASE or localStorage override
 * - Attaches verified backend JWT or fresh Firebase ID token in Authorization header
 * - Never masks GitHub Pages static 404s as successful API calls
 */

export const getApiBase = () => {
  const customOverride = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_backend_url') : null;
  const envUrl = customOverride || import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api';
    }
  }
  return null;
};

export const isBackendConfigured = () => Boolean(getApiBase());

export const setCustomBackendUrl = (url) => {
  if (typeof localStorage !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem('gosh_backend_url');
    } else {
      let clean = url.trim().replace(/\/+$/, '');
      if (clean.endsWith('/api')) clean = clean.slice(0, -4);
      localStorage.setItem('gosh_backend_url', clean);
    }
  }
};

export const getCustomBackendUrl = () => {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_backend_url') || '' : '';
};

export const resolveFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const apiBase = getApiBase();
  if (!apiBase || apiBase === '/api') {
    return url;
  }
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const API_BASE = getApiBase() || '/api';

async function getAuthHeaders(extra = {}, includeJsonContentType = true) {
  let token = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_jwt_token') : null;

  if (!token && auth?.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch {
      token = null;
    }
  }

  return {
    ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

async function safeRequest(endpoint, options = {}, defaultData = {}) {
  const currentBase = getApiBase();
  if (!currentBase && !endpoint.startsWith('http')) {
    return {
      success: false,
      offline: true,
      backendNotConfigured: true,
      message: 'Backend server URL is not configured (VITE_API_URL). Please connect your Render backend URL in Settings or GitHub Secrets.',
      ...defaultData
    };
  }

  const fullUrl = endpoint.startsWith('http')
    ? endpoint
    : `${currentBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const res = await fetch(fullUrl, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!text || text.trim().length === 0) {
      return {
        success: res.ok,
        status: res.status,
        empty: true,
        message: res.status === 405 || res.status === 404
          ? 'Backend endpoint not found on static host. Please connect your deployed backend server.'
          : (res.ok ? 'Operation completed successfully' : `Server responded with status ${res.status}`),
        ...defaultData
      };
    }

    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        return {
          ...defaultData,
          success: json.success !== undefined ? json.success : res.ok,
          status: res.status,
          ...json
        };
      } catch (parseErr) {
        return {
          success: false,
          status: res.status,
          error: 'Malformed JSON response',
          message: 'Received invalid data format from server.',
          ...defaultData
        };
      }
    }

    return {
      success: false,
      status: res.status,
      error: `Non-JSON response (${res.status})`,
      message: res.status === 404
        ? 'Backend API not reachable at this address. Please verify your Render backend deployment.'
        : `Server returned non-JSON response (${res.status})`,
      isHtml: contentType.includes('text/html'),
      ...defaultData
    };
  } catch (netErr) {
    console.warn(`API Connection error for ${fullUrl}:`, netErr.message);
    return {
      success: false,
      error: netErr.message || 'Network request failed',
      message: 'Unable to connect to the backend server. Please verify your internet connection or Render backend status.',
      offline: true,
      ...defaultData
    };
  }
}

export const api = {
  // Agree and Continue Terms Acceptance
  async recordTermsAcceptance(termsVersion = '1.0.0', privacyVersion = '1.0.0') {
    return safeRequest('/auth/terms-accept', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ termsVersion, privacyVersion, timestamp: new Date().toISOString() })
    });
  },

  // Identifier Resolution (Username / Mobile -> Email)
  async resolveIdentifier(identifier) {
    return safeRequest('/auth/resolve-identifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
  },

  // Check username, mobile & email uniqueness
  async checkAvailability(username, mobile, email = null) {
    return safeRequest('/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mobile, email })
    });
  },

  // Send Google SMTP OTP
  async sendOTP(email, purpose = 'signup', identifier = null) {
    return safeRequest('/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose, identifier })
    });
  },

  // Verify OTP
  async verifyOTP(email, otp, purpose = 'signup', identifier = null) {
    return safeRequest('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose, identifier })
    });
  },

  // Login via Phone or Email + OTP
  async loginWithOtp(identifier, otp) {
    const data = await safeRequest('/auth/login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp })
    });
    if (data?.token && typeof localStorage !== 'undefined') {
      localStorage.setItem('gosh_jwt_token', data.token);
    }
    return data;
  },

  // Password Reset OTP Verification
  async resetPasswordWithOtp(identifier, otp) {
    return safeRequest('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp })
    });
  },

  // Sync / Initialize Verified Firebase User in Supabase via Backend
  async syncUser(firebaseIdToken, profileMetadata = {}) {
    if (!firebaseIdToken) {
      return { success: false, message: 'Firebase ID token is required to sync user.' };
    }
    const data = await safeRequest('/auth/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firebaseIdToken}`
      },
      body: JSON.stringify(profileMetadata)
    });
    if (data?.token && typeof localStorage !== 'undefined') {
      localStorage.setItem('gosh_jwt_token', data.token);
    }
    return data;
  },

  // Contact Discovery & Search
  async searchUsers(query) {
    return safeRequest(
      `/users/search?q=${encodeURIComponent(query || '')}`,
      { headers: await getAuthHeaders() },
      { users: [] }
    );
  },

  // Contact Management
  async getContacts() {
    return safeRequest(
      '/users/contacts',
      { headers: await getAuthHeaders() },
      { contacts: [] }
    );
  },

  async addContact(contactUserId, nickname = null) {
    return safeRequest('/users/contacts', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ contactUserId, nickname })
    });
  },

  async updateContact(contactUserId, nickname) {
    return safeRequest(`/users/contacts/${contactUserId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ nickname })
    });
  },

  async removeContact(contactUserId) {
    return safeRequest(`/users/contacts/${contactUserId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
  },

  // Blocked Users
  async getBlockedUsers() {
    return safeRequest(
      '/users/blocked',
      { headers: await getAuthHeaders() },
      { blockedUsers: [] }
    );
  },

  async blockUser(blockedUserId) {
    return safeRequest('/users/block', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ blockedUserId })
    });
  },

  async unblockUser(blockedUserId) {
    return safeRequest('/users/unblock', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ blockedUserId })
    });
  },

  // Profile Management
  async getProfile(userId) {
    return safeRequest(
      `/users/profile/${userId}`,
      { headers: await getAuthHeaders() },
      { profile: null }
    );
  },

  async updateProfile(userId, profileData) {
    return safeRequest(`/users/profile/${userId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
  },

  // Conversations & Messages
  async getConversations() {
    return safeRequest(
      '/conversations',
      { headers: await getAuthHeaders() },
      { conversations: [] }
    );
  },

  async createConversation(data) {
    return safeRequest('/conversations', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },

  async createGroup(groupData) {
    return safeRequest('/conversations/group', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(groupData)
    });
  },

  async getMessages(conversationId) {
    return safeRequest(
      `/messages/${conversationId}`,
      { headers: await getAuthHeaders() },
      { messages: [] }
    );
  },

  async sendMessage(data) {
    return safeRequest('/messages', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },

  async uploadAttachment(formData) {
    return safeRequest('/messages/upload', {
      method: 'POST',
      headers: await getAuthHeaders({}, false),
      body: formData
    });
  },

  async deleteMessage(messageId, userId, deleteForEveryone = false) {
    return safeRequest(`/messages/${messageId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId, deleteForEveryone })
    });
  },

  async reactToMessage(messageId, userId, reaction) {
    return safeRequest(`/messages/${messageId}/reaction`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId, reaction })
    });
  },

  // Status / Stories
  async getStatuses() {
    return safeRequest(
      '/statuses',
      { headers: await getAuthHeaders() },
      { statuses: [], myStatuses: [] }
    );
  },

  async createStatus(formData) {
    return safeRequest('/statuses', {
      method: 'POST',
      headers: await getAuthHeaders({}, false),
      body: formData
    });
  },

  async markStatusViewed(statusId, viewerId, viewerName) {
    return safeRequest(`/statuses/${statusId}/view`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ viewerId, viewerName })
    });
  },

  async deleteStatus(statusId) {
    return safeRequest(`/statuses/${statusId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
  },

  // Calls
  async getCallHistory() {
    return safeRequest(
      '/calls/history',
      { headers: await getAuthHeaders() },
      { calls: [] }
    );
  },

  async logCall(callData) {
    return safeRequest('/calls/log', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(callData)
    });
  },

  // Memory Vault
  async getMemories() {
    return safeRequest(
      '/memory-vault',
      { headers: await getAuthHeaders() },
      { memories: [] }
    );
  },

  async uploadMemory(formData) {
    return safeRequest('/memory-vault/upload', {
      method: 'POST',
      headers: await getAuthHeaders({}, false),
      body: formData
    });
  },

  async deleteMemory(memoryId) {
    return safeRequest(`/memory-vault/${memoryId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
  },

  // Settings & Passcode Vault
  async getSettings(userId) {
    return safeRequest(
      `/settings/${userId || 'me'}`,
      { headers: await getAuthHeaders() },
      { settings: null }
    );
  },

  async updateSettings(userId, settings) {
    return safeRequest(`/settings/${userId || 'me'}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(settings)
    });
  },

  async verifyPasscode(userId, passcode) {
    return safeRequest(`/settings/${userId || 'me'}/verify-passcode`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ passcode })
    });
  },

  // E2EE Public Keys
  async publishPublicKey(userId, publicKey) {
    return safeRequest('/users/public-key', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId, publicKey })
    });
  },

  async getPublicKey(userId) {
    return safeRequest(
      `/users/${userId}/public-key`,
      { headers: await getAuthHeaders() },
      { publicKey: null }
    );
  },

  resolveFileUrl
};

export default api;
