const API_BASE = '/api';

export const api = {
  // Agree and Continue Terms Acceptance
  async recordTermsAcceptance(termsVersion = '1.0.0', privacyVersion = '1.0.0') {
    const res = await fetch(`${API_BASE}/auth/terms-accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termsVersion, privacyVersion, timestamp: new Date().toISOString() })
    });
    return res.json();
  },

  // Identifier Resolution (Username / Mobile -> Email)
  async resolveIdentifier(identifier) {
    const res = await fetch(`${API_BASE}/auth/resolve-identifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    return res.json();
  },

  // Check username & mobile uniqueness
  async checkAvailability(username, mobile) {
    const res = await fetch(`${API_BASE}/auth/check-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mobile })
    });
    return res.json();
  },

  // Send Google SMTP OTP
  async sendOTP(email, purpose = 'signup') {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose })
    });
    return res.json();
  },

  // Verify OTP
  async verifyOTP(email, otp, purpose = 'signup') {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose })
    });
    return res.json();
  },

  // Sync / Initialize User in Backend
  async syncUser(userData) {
    const res = await fetch(`${API_BASE}/auth/sync-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  // Contact Discovery & Search
  async searchUsers(query) {
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  // Profile Management
  async getProfile(userId) {
    const res = await fetch(`${API_BASE}/users/profile/${userId}`);
    return res.json();
  },

  async updateProfile(userId, profileData) {
    const res = await fetch(`${API_BASE}/users/profile/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  // Conversations & Messages
  async getConversations(userId) {
    const res = await fetch(`${API_BASE}/conversations?userId=${userId}`);
    return res.json();
  },

  async getMessages(conversationId) {
    const res = await fetch(`${API_BASE}/messages/${conversationId}`);
    return res.json();
  },

  async sendMessage(data) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Upload message attachment (images, audio, video, docs)
  async uploadAttachment(formData) {
    const res = await fetch(`${API_BASE}/messages/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  async deleteMessage(messageId, userId, deleteForEveryone = false) {
    const res = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deleteForEveryone })
    });
    return res.json();
  },

  async reactToMessage(messageId, userId, reaction) {
    const res = await fetch(`${API_BASE}/messages/${messageId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reaction })
    });
    return res.json();
  },

  // Status / Stories
  async getStatuses(userId) {
    const res = await fetch(`${API_BASE}/statuses?userId=${userId}`);
    return res.json();
  },

  async createStatus(formData) {
    const res = await fetch(`${API_BASE}/statuses`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  async markStatusViewed(statusId, viewerId) {
    const res = await fetch(`${API_BASE}/statuses/${statusId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerId })
    });
    return res.json();
  },

  // Calls
  async getCallHistory(userId) {
    const res = await fetch(`${API_BASE}/calls/history?userId=${userId}`);
    return res.json();
  },

  async logCall(callData) {
    const res = await fetch(`${API_BASE}/calls/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callData)
    });
    return res.json();
  },

  // Memory Vault (MEGA Cloud Storage)
  async getMemories(spaceId = 'default') {
    const res = await fetch(`${API_BASE}/memory-vault?spaceId=${spaceId}`);
    return res.json();
  },

  async uploadMemory(formData) {
    const res = await fetch(`${API_BASE}/memory-vault/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  async deleteMemory(memoryId, userId) {
    const res = await fetch(`${API_BASE}/memory-vault/${memoryId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.json();
  },

  // Settings & Passcode Vault
  async getSettings(userId) {
    const res = await fetch(`${API_BASE}/settings/${userId}`);
    return res.json();
  },

  async updateSettings(userId, settings) {
    const res = await fetch(`${API_BASE}/settings/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async verifyPasscode(userId, passcode) {
    const res = await fetch(`${API_BASE}/settings/${userId}/verify-passcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    return res.json();
  }
};

export default api;
