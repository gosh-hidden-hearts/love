import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists for local fallback storage
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial fallback store
let fallbackStore = {
  users: [],
  profiles: [],
  identifiers: [],
  settings: [],
  conversations: [],
  messages: [],
  statuses: [],
  calls: [],
  memories: [],
  terms_acceptance: [],
  otp_verifications: []
};

// Load existing store if available
if (fs.existsSync(STORE_PATH)) {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    fallbackStore = { ...fallbackStore, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Could not read store.json, using fresh store.');
  }
}

function persistFallback() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallbackStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing fallback store:', err);
  }
}

export const db = {
  // =========================================================================
  // USERS & IDENTIFIERS
  // =========================================================================
  async findUserByIdentifier(identifier) {
    const trimmed = identifier.trim().toLowerCase();

    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, user_profiles(*)')
        .or(`email.eq.${trimmed},username.eq.${trimmed},mobile_number.eq.${trimmed}`)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      // Supabase table not migrated or accessible, proceed to fallback
    }

    // Fallback store search
    const user = fallbackStore.users.find(
      (u) =>
        u.email?.toLowerCase() === trimmed ||
        u.username?.toLowerCase() === trimmed ||
        u.mobile_number === trimmed
    );

    if (user) {
      const profile = fallbackStore.profiles.find((p) => p.user_id === user.id);
      return { ...user, user_profiles: profile };
    }

    return null;
  },

  async createUser(userData, profileData) {
    // 1. Try Supabase
    try {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (!error && newUser) {
        await supabase
          .from('user_profiles')
          .insert([{ user_id: newUser.id, ...profileData }]);
        return { user: newUser, profile: profileData };
      }
    } catch (e) {
      // Supabase fallback
    }

    // 2. Fallback local store
    const userId = userData.id || 'usr-' + Date.now();
    const fullUser = { id: userId, ...userData, created_at: new Date().toISOString() };
    const fullProfile = { user_id: userId, ...profileData, created_at: new Date().toISOString() };

    // Remove old if exists
    fallbackStore.users = fallbackStore.users.filter((u) => u.email !== userData.email);
    fallbackStore.profiles = fallbackStore.profiles.filter((p) => p.user_id !== userId);

    fallbackStore.users.push(fullUser);
    fallbackStore.profiles.push(fullProfile);
    persistFallback();

    return { user: fullUser, profile: fullProfile };
  },

  async updateUserProfile(userId, updateData) {
    try {
      await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId);
    } catch (e) {}

    // Fallback
    const pIndex = fallbackStore.profiles.findIndex((p) => p.user_id === userId);
    if (pIndex !== -1) {
      fallbackStore.profiles[pIndex] = { ...fallbackStore.profiles[pIndex], ...updateData };
    } else {
      fallbackStore.profiles.push({ user_id: userId, ...updateData });
    }
    persistFallback();
    return true;
  },

  async searchUsers(query) {
    const q = (query || '').toLowerCase().trim();

    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, username, mobile_number, user_profiles(display_name, avatar_url, bio, online_status)')
        .or(`username.ilike.%${q}%,email.ilike.%${q}%,mobile_number.ilike.%${q}%`)
        .limit(20);

      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          email: d.email,
          username: d.username,
          mobile_number: d.mobile_number,
          display_name: d.user_profiles?.display_name || d.username,
          avatar_url: d.user_profiles?.avatar_url,
          online_status: d.user_profiles?.online_status
        }));
      }
    } catch (e) {}

    // Fallback store
    const matched = fallbackStore.users.filter(
      (u) =>
        !q ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.mobile_number?.includes(q)
    );

    return matched.map((u) => {
      const prof = fallbackStore.profiles.find((p) => p.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        mobile_number: u.mobile_number,
        display_name: prof?.display_name || u.username,
        avatar_url: prof?.avatar_url,
        online_status: prof?.online_status || false
      };
    });
  },

  // =========================================================================
  // OTP VERIFICATIONS
  // =========================================================================
  async saveOtp(email, otpHash, purpose, expiresAt) {
    try {
      await supabase
        .from('otp_verifications')
        .insert([{ email, otp_hash: otpHash, purpose, expires_at: expiresAt }]);
    } catch (e) {}

    fallbackStore.otp_verifications.push({
      id: 'otp-' + Date.now(),
      email,
      otp_hash: otpHash,
      purpose,
      expires_at: expiresAt,
      is_used: false,
      created_at: new Date().toISOString()
    });
    persistFallback();
  },

  async getLatestOtp(email, purpose) {
    const records = fallbackStore.otp_verifications.filter(
      (o) => o.email === email && o.purpose === purpose && !o.is_used
    );
    if (records.length === 0) return null;
    return records[records.length - 1];
  },

  async markOtpUsed(otpId) {
    const o = fallbackStore.otp_verifications.find((x) => x.id === otpId);
    if (o) {
      o.is_used = true;
      persistFallback();
    }
  },

  // =========================================================================
  // TERMS ACCEPTANCE
  // =========================================================================
  async recordTermsAcceptance(data) {
    try {
      await supabase.from('terms_acceptance').insert([data]);
    } catch (e) {}
    fallbackStore.terms_acceptance.push({ ...data, id: 'terms-' + Date.now() });
    persistFallback();
  },

  // =========================================================================
  // CONVERSATIONS & MESSAGES
  // =========================================================================
  async getConversationsForUser(userId) {
    return fallbackStore.conversations;
  },

  async saveMessage(msg) {
    try {
      await supabase.from('messages').insert([msg]);
    } catch (e) {}
    fallbackStore.messages.push(msg);
    persistFallback();
    return msg;
  },

  async getMessages(conversationId) {
    return fallbackStore.messages.filter((m) => m.conversationId === conversationId || !conversationId);
  },

  // =========================================================================
  // STATUSES
  // =========================================================================
  async saveStatus(status) {
    try {
      await supabase.from('statuses').insert([status]);
    } catch (e) {}
    fallbackStore.statuses.unshift(status);
    persistFallback();
    return status;
  },

  async getStatuses() {
    return fallbackStore.statuses;
  },

  // =========================================================================
  // MEMORY VAULT
  // =========================================================================
  async saveMemory(memory) {
    try {
      await supabase.from('memory_files').insert([memory]);
    } catch (e) {}
    fallbackStore.memories.unshift(memory);
    persistFallback();
    return memory;
  },

  async getMemories() {
    return fallbackStore.memories;
  },

  async deleteMemory(memoryId) {
    fallbackStore.memories = fallbackStore.memories.filter((m) => m.id !== memoryId);
    persistFallback();
    return true;
  },

  // =========================================================================
  // CALLS
  // =========================================================================
  async saveCallLog(callData) {
    try {
      await supabase.from('calls').insert([callData]);
    } catch (e) {}
    fallbackStore.calls.unshift(callData);
    persistFallback();
    return callData;
  },

  async getCallHistory(userId) {
    return fallbackStore.calls;
  }
};

export default db;
