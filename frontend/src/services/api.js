/**
 * GOSH Hidden Hearts - API Service Client
 * Features:
 * - Robust safeRequest wrapper preventing "Unexpected end of JSON input" and "Unexpected token '<'"
 * - Automatic Content-Type and Authorization header management
 * - Handles empty responses (204 No Content, Content-Length: 0) and non-JSON HTML (404/405 static errors)
 * - Resolves production backend URL from VITE_API_URL / VITE_API_BASE
 */

// Resolves the backend API base URL with custom user override & environment variable support
export const getApiBase = () => {
  const customOverride = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_backend_url') : null;
  const envUrl = customOverride || import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  // In local browser dev, Vite proxies /api to port 5000
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api';
    }
  }
  return '/api';
};

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

export const API_BASE = getApiBase();

function getAuthHeaders(extra = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_jwt_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra
  };
}

/**
 * Robust fetch wrapper:
 * 1. Safely reads response as text first.
 * 2. Never calls res.json() on empty responses (prevents "Unexpected end of JSON input").
 * 3. Never calls res.json() on HTML/404 pages (prevents "Unexpected token '<'").
 * 4. Catches network disconnections and offline errors gracefully without throwing unhandled exceptions.
 */
async function safeRequest(endpoint, options = {}, defaultData = {}) {
  const currentBase = getApiBase();
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
          ...json
        };
      } catch (parseErr) {
        console.warn(`JSON parse error from ${fullUrl}:`, parseErr.message);
        return {
          success: false,
          status: res.status,
          error: 'Malformed JSON response',
          message: 'Received invalid data format from server.',
          ...defaultData
        };
      }
    }

    // Response is HTML (e.g. 404 from GitHub Pages) or other non-JSON text
    return {
      success: false,
      status: res.status,
      error: `Non-JSON response (${res.status})`,
      message: res.status === 404
        ? 'Backend API not reachable at this address. Please verify your backend server deployment.'
        : `Server returned non-JSON response (${res.status})`,
      isHtml: contentType.includes('text/html'),
      ...defaultData
    };
  } catch (netErr) {
    console.warn(`API Connection error for ${fullUrl}:`, netErr.message);
    return {
      success: false,
      error: netErr.message || 'Network request failed',
      message: 'Unable to connect to the backend server. Please verify your internet connection or backend server status.',
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
      headers: { 'Content-Type': 'application/json' },
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

  // Check username & mobile uniqueness
  async checkAvailability(username, mobile) {
    return safeRequest('/auth/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mobile })
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

  // Password Reset with OTP
  async resetPasswordWithOtp(identifier, otp, newPassword) {
    return safeRequest('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp, newPassword })
    });
  },

  // Sync / Initialize User in Backend
  async syncUser(userData) {
    const data = await safeRequest('/auth/sync-user', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
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
      { headers: getAuthHeaders() },
      { users: [] }
    );
  },

  // Contact Management
  async getContacts(userId) {
    return safeRequest(
      `/users/contacts?userId=${userId || ''}`,
      { headers: getAuthHeaders() },
      { contacts: [] }
    );
  },

  async addContact(contactUserId, nickname = null, userId = null) {
    return safeRequest('/users/contacts', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ contactUserId, nickname, userId })
    });
  },

  async updateContact(contactUserId, nickname, userId = null) {
    return safeRequest(`/users/contacts/${contactUserId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nickname, userId })
    });
  },

  async removeContact(contactUserId, userId = null) {
    return safeRequest(`/users/contacts/${contactUserId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
  },

  // Blocked Users
  async getBlockedUsers(userId) {
    return safeRequest(
      `/users/blocked?userId=${userId || ''}`,
      { headers: getAuthHeaders() },
      { blockedUsers: [] }
    );
  },

  async blockUser(blockedUserId) {
    return safeRequest('/users/block', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ blockedUserId })
    });
  },

  async unblockUser(blockedUserId) {
    return safeRequest('/users/unblock', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ blockedUserId })
    });
  },

  // Profile Management
  async getProfile(userId) {
    return safeRequest(
      `/users/profile/${userId}`,
      { headers: getAuthHeaders() },
      { profile: null }
    );
  },

  async updateProfile(userId, profileData) {
    return safeRequest(`/users/profile/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
  },

  // Conversations & Messages
  async getConversations(userId) {
    return safeRequest(
      `/conversations?userId=${userId || ''}`,
      { headers: getAuthHeaders() },
      { conversations: [] }
    );
  },

  async createConversation(data) {
    return safeRequest('/conversations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },

  async createGroup(groupData) {
    return safeRequest('/conversations/group', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(groupData)
    });
  },

  async getMessages(conversationId) {
    return safeRequest(
      `/messages/${conversationId}`,
      { headers: getAuthHeaders() },
      { messages: [] }
    );
  },

  async sendMessage(data) {
    return safeRequest('/messages', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
  },

  // Upload message attachment (images, audio, video, docs)
  async uploadAttachment(formData) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_jwt_token') : null;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return safeRequest('/messages/upload', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  async deleteMessage(messageId, userId, deleteForEveryone = false) {
    return safeRequest(`/messages/${messageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, deleteForEveryone })
    });
  },

  async reactToMessage(messageId, userId, reaction) {
    return safeRequest(`/messages/${messageId}/reaction`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, reaction })
    });
  },

  // Status / Stories
  async getStatuses(userId) {
    return safeRequest(
      `/statuses?userId=${userId || ''}`,
      { headers: getAuthHeaders() },
      { statuses: [], myStatuses: [] }
    );
  },

  async createStatus(formData) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_jwt_token') : null;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return safeRequest('/statuses', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  async markStatusViewed(statusId, viewerId, viewerName) {
    return safeRequest(`/statuses/${statusId}/view`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ viewerId, viewerName })
    });
  },

  async deleteStatus(statusId) {
    return safeRequest(`/statuses/${statusId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  },

  // Calls
  async getCallHistory(userId) {
    return safeRequest(
      `/calls/history?userId=${userId || ''}`,
      { headers: getAuthHeaders() },
      { calls: [] }
    );
  },

  async logCall(callData) {
    return safeRequest('/calls/log', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(callData)
    });
  },

  // Memory Vault (MEGA Cloud Storage)
  async getMemories(spaceId = 'default') {
    return safeRequest(
      `/memory-vault?spaceId=${spaceId}`,
      { headers: getAuthHeaders() },
      { memories: [] }
    );
  },

  async uploadMemory(formData) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_jwt_token') : null;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    return safeRequest('/memory-vault/upload', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  async deleteMemory(memoryId, userId) {
    return safeRequest(`/memory-vault/${memoryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
  },

  // Settings & Passcode Vault
  async getSettings(userId) {
    return safeRequest(
      `/settings/${userId || ''}`,
      { headers: getAuthHeaders() },
      { settings: null }
    );
  },

  async updateSettings(userId, settings) {
    return safeRequest(`/settings/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
  },

  async verifyPasscode(userId, passcode) {
    return safeRequest(`/settings/${userId}/verify-passcode`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ passcode })
    });
  },

  // E2EE Public Keys
  async publishPublicKey(userId, publicKey) {
    return safeRequest('/users/public-key', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, publicKey })
    });
  },

  async getPublicKey(userId) {
    return safeRequest(
      `/users/${userId}/public-key`,
      { headers: getAuthHeaders() },
      { publicKey: null }
    );
  }
};

export default api;
