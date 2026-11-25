import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  otp_verifications: [],
  contacts: [],
  blocked_users: []
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
    if (!q) return [];

    try {
      const { data } = await supabase
        .from('users')
        .select('id, username, user_profiles(display_name, avatar_url, bio, online_status)')
        .or(`username.ilike.%${q}%,email.ilike.%${q}%,id.eq.${q}`)
        .limit(20);

      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          username: d.username,
          displayName: d.user_profiles?.display_name || d.username,
          avatarUrl: d.user_profiles?.avatar_url,
          bio: d.user_profiles?.bio || 'In a love story written by the stars ✨',
          onlineStatus: Boolean(d.user_profiles?.online_status)
        }));
      }
    } catch (e) {}

    // Fallback store search (stripping private email and mobile number)
    const matched = fallbackStore.users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.id?.toLowerCase() === q ||
        u.email?.toLowerCase() === q ||
        u.mobile_number === q
    );

    return matched.map((u) => {
      const prof = fallbackStore.profiles.find((p) => p.user_id === u.id);
      return {
        id: u.id,
        username: u.username,
        displayName: prof?.display_name || u.username,
        avatarUrl: prof?.avatar_url,
        bio: prof?.bio || 'In a love story written by the stars ✨',
        onlineStatus: Boolean(prof?.online_status)
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
  // CONVERSATIONS & GROUPS
  // =========================================================================
  async getConversationsForUser(userId) {
    if (!fallbackStore.conversations) fallbackStore.conversations = [];

    // Filter conversations where user is a participant or member
    const userConvs = fallbackStore.conversations.filter(
      (c) =>
        c.partnerId === userId ||
        c.creatorId === userId ||
        (Array.isArray(c.members) && c.members.includes(userId))
    );

    if (userConvs.length > 0) return userConvs;
    return fallbackStore.conversations;
  },

  async getConversationById(conversationId) {
    if (!conversationId) return null;

    if (!fallbackStore.conversations) fallbackStore.conversations = [];
    const local = fallbackStore.conversations.find((c) => c.id === conversationId);
    if (local) return local;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, conversation_members(*)')
        .eq('id', conversationId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          type: data.type,
          name: data.title,
          isGroup: data.type === 'group',
          partnerId: data.type === 'direct' ? data.conversation_members?.find((m) => true)?.user_id : null,
          members: data.conversation_members?.map((m) => m.user_id) || []
        };
      }
    } catch (e) {}

    return null;
  },

  async isConversationMember(userId, conversationId) {
    if (!userId || !conversationId) return false;
    if (conversationId === 'conv-default' || conversationId.startsWith('partner-demo')) return true;

    if (!fallbackStore.conversations) fallbackStore.conversations = [];
    const conv = fallbackStore.conversations.find((c) => c.id === conversationId);
    if (conv) {
      if (conv.creatorId === userId || conv.partnerId === userId) return true;
      if (Array.isArray(conv.members) && conv.members.includes(userId)) return true;
    }

    try {
      const { data, error } = await supabase
        .from('conversation_members')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) return true;
    } catch (e) {}

    return false;
  },

  async createConversation(convData) {
    if (!fallbackStore.conversations) fallbackStore.conversations = [];
    const convId = convData.id || 'conv-' + Date.now();
    const newConv = {
      id: convId,
      type: convData.type || 'direct', // 'direct' | 'group'
      name: convData.name || convData.title || 'Soul Chat',
      avatarUrl: convData.avatarUrl || null,
      isGroup: convData.type === 'group',
      description: convData.description || null,
      creatorId: convData.creatorId || null,
      partnerId: convData.partnerId || null,
      members: convData.members || [],
      lastMessageText: convData.lastMessageText || 'Chat created',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      createdAt: new Date().toISOString()
    };

    try {
      await supabase.from('conversations').insert([{
        id: convId,
        type: newConv.type,
        title: newConv.name,
        last_message_text: newConv.lastMessageText,
        last_message_at: newConv.lastMessageAt
      }]);
    } catch (e) {}

    fallbackStore.conversations.unshift(newConv);
    persistFallback();
    return newConv;
  },

  // =========================================================================
  // MESSAGES, REACTIONS & DELETIONS
  // =========================================================================
  async saveMessage(msg) {
    try {
      await supabase.from('messages').insert([msg]);
    } catch (e) {}

    if (!fallbackStore.messages) fallbackStore.messages = [];
    fallbackStore.messages.push(msg);

    // Update conversation last message snippet
    if (fallbackStore.conversations) {
      const conv = fallbackStore.conversations.find((c) => c.id === msg.conversationId);
      if (conv) {
        conv.lastMessageText = msg.content || (msg.messageType === 'audio' ? 'Voice Message 🎙️' : 'Attachment 📎');
        conv.lastMessageAt = msg.createdAt;
      }
    }

    persistFallback();
    return msg;
  },

  async getMessages(conversationId) {
    if (!fallbackStore.messages) fallbackStore.messages = [];
    return fallbackStore.messages.filter((m) => m.conversationId === conversationId || !conversationId);
  },

  async reactToMessage(messageId, userId, reaction) {
    if (!fallbackStore.messages) fallbackStore.messages = [];
    const msg = fallbackStore.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.reaction = reaction;
      persistFallback();
    }

    try {
      await supabase.from('message_reactions').upsert([{
        message_id: messageId,
        user_id: userId,
        reaction
      }]);
    } catch (e) {}

    return true;
  },

  async deleteMessage(messageId, deleteForEveryone = false) {
    if (!fallbackStore.messages) fallbackStore.messages = [];
    if (deleteForEveryone) {
      const msg = fallbackStore.messages.find((m) => m.id === messageId);
      if (msg) {
        msg.content = '🚫 This message was deleted.';
        msg.is_deleted_for_all = true;
        msg.mediaUrl = null;
        msg.audioUrl = null;
        persistFallback();
      }
    } else {
      fallbackStore.messages = fallbackStore.messages.filter((m) => m.id !== messageId);
      persistFallback();
    }

    try {
      if (deleteForEveryone) {
        await supabase.from('messages').update({
          content: '🚫 This message was deleted.',
          is_deleted_for_all: true
        }).eq('id', messageId);
      } else {
        await supabase.from('messages').delete().eq('id', messageId);
      }
    } catch (e) {}

    return true;
  },

  // =========================================================================
  // STATUSES (24-Hour Ephemeral Stories)
  // =========================================================================
  async saveStatus(status) {
    try {
      await supabase.from('statuses').insert([status]);
    } catch (e) {}
    if (!fallbackStore.statuses) fallbackStore.statuses = [];
    fallbackStore.statuses.unshift(status);
    persistFallback();
    return status;
  },

  async getStatuses(userId) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let allStatuses = [];

    try {
      const { data, error } = await supabase
        .from('statuses')
        .select('*, user:user_id(id, username, user_profiles(*)), status_views(*)')
        .gt('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        allStatuses = data.map(s => ({
          id: s.id,
          userId: s.user_id,
          userName: s.user?.user_profiles?.display_name || s.user?.username || 'Partner',
          userAvatar: s.user?.user_profiles?.avatar_url,
          type: s.type || 'text',
          content: s.content,
          gradient: s.gradient,
          mediaUrl: s.media_url,
          caption: s.caption,
          privacy: s.privacy || 'contacts',
          createdAt: s.created_at,
          expiresAt: s.expires_at,
          viewsCount: s.status_views?.length || 0,
          viewers: (s.status_views || []).map(v => v.viewer_id)
        }));
      }
    } catch (e) {}

    // Fallback store
    if (allStatuses.length === 0) {
      if (!fallbackStore.statuses) fallbackStore.statuses = [];
      allStatuses = fallbackStore.statuses.filter(s => {
        const createdAt = new Date(s.createdAt || s.created_at || 0);
        const expiresAt = s.expiresAt ? new Date(s.expiresAt) : new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
        return expiresAt > now;
      });
    }

    const myStatuses = userId ? allStatuses.filter(s => s.userId === userId) : [];
    const otherStatuses = userId ? allStatuses.filter(s => s.userId !== userId) : allStatuses;

    return { statuses: otherStatuses, myStatuses };
  },

  async markStatusViewed(statusId, viewerId, viewerName) {
    if (!viewerId) return null;

    try {
      await supabase.from('status_views').insert([{
        status_id: statusId,
        viewer_id: viewerId,
        viewed_at: new Date().toISOString()
      }]);
    } catch (e) {}

    if (!fallbackStore.statuses) fallbackStore.statuses = [];
    const status = fallbackStore.statuses.find(s => s.id === statusId);
    if (status) {
      if (!status.viewers) status.viewers = [];
      const alreadyViewed = status.viewers.some(v => (typeof v === 'string' ? v === viewerId : v.viewerId === viewerId));
      if (!alreadyViewed) {
        status.viewers.push({
          viewerId,
          viewerName: viewerName || 'Partner',
          viewedAt: new Date().toISOString()
        });
        status.viewsCount = (status.viewsCount || 0) + 1;
        persistFallback();
      }
      return status;
    }
    return null;
  },

  async deleteStatus(statusId) {
    try {
      await supabase.from('statuses').delete().eq('id', statusId);
    } catch (e) {}

    if (!fallbackStore.statuses) fallbackStore.statuses = [];
    fallbackStore.statuses = fallbackStore.statuses.filter(s => s.id !== statusId);
    persistFallback();
    return true;
  },

  // =========================================================================
  // MEMORY VAULT (MEGA Cloud Storage Integration)
  // =========================================================================
  async saveMemory(memory) {
    try {
      await supabase.from('memory_files').insert([memory]);
    } catch (e) {}
    if (!fallbackStore.memories) fallbackStore.memories = [];
    fallbackStore.memories.unshift(memory);
    persistFallback();
    return memory;
  },

  async getMemories(userId) {
    try {
      const { data, error } = await supabase
        .from('memory_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(m => ({
          id: m.id,
          fileName: m.file_name || m.fileName,
          fileType: m.file_type || m.fileType,
          fileSize: m.file_size || m.fileSize,
          mimeType: m.mime_type || m.mimeType,
          megaFileHandle: m.mega_file_handle || m.megaFileHandle,
          megaDownloadUrl: m.mega_download_url || m.megaDownloadUrl,
          caption: m.caption,
          memoryDate: m.memory_date || m.memoryDate,
          feelingsTag: m.feelings_tag || m.feelingsTag,
          album: m.album || 'All Memories',
          uploaderId: m.uploader_id || m.uploaderId,
          uploaderName: m.uploader_name || m.uploaderName || 'Soul Partner',
          createdAt: m.created_at || m.createdAt
        }));
      }
    } catch (e) {}

    if (!fallbackStore.memories) fallbackStore.memories = [];
    return fallbackStore.memories;
  },

  async getMemoryById(memoryId) {
    if (!fallbackStore.memories) fallbackStore.memories = [];
    return fallbackStore.memories.find(m => m.id === memoryId) || null;
  },

  async deleteMemory(memoryId) {
    try {
      await supabase.from('memory_files').delete().eq('id', memoryId);
    } catch (e) {}

    if (!fallbackStore.memories) fallbackStore.memories = [];
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
    if (!fallbackStore.calls) fallbackStore.calls = [];
    fallbackStore.calls.unshift(callData);
    persistFallback();
    return callData;
  },

  async getCallHistory(userId) {
    try {
      if (userId) {
        const { data, error } = await supabase
          .from('calls')
          .select('*, caller:caller_id(id, username, user_profiles(*)), receiver:receiver_id(id, username, user_profiles(*))')
          .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(c => {
            const isCaller = c.caller_id === userId;
            const partner = isCaller ? c.receiver : c.caller;
            return {
              id: c.id,
              callerId: c.caller_id,
              receiverId: c.receiver_id,
              partnerId: partner?.id || (isCaller ? c.receiver_id : c.caller_id),
              partnerName: partner?.user_profiles?.display_name || partner?.username || 'GOSH Connection',
              partnerAvatar: partner?.user_profiles?.avatar_url,
              callType: c.call_type || c.callType,
              direction: isCaller ? 'outgoing' : 'incoming',
              status: c.status || c.call_status || c.callStatus,
              durationSeconds: c.duration_seconds || c.durationSeconds || 0,
              createdAt: c.created_at || c.createdAt
            };
          });
        }
      }
    } catch (e) {}

    // Fallback store
    if (!fallbackStore.calls) fallbackStore.calls = [];
    const callsList = userId
      ? fallbackStore.calls.filter(c => c.callerId === userId || c.receiverId === userId)
      : fallbackStore.calls;

    return callsList.map(c => {
      const isCaller = c.callerId === userId;
      const partnerId = isCaller ? c.receiverId : c.callerId;
      const partnerUser = (fallbackStore.users || []).find(u => u.id === partnerId);
      const partnerProfile = (fallbackStore.profiles || []).find(p => p.user_id === partnerId);

      return {
        id: c.id,
        callerId: c.callerId,
        receiverId: c.receiverId,
        partnerId: partnerId,
        partnerName: partnerProfile?.display_name || partnerUser?.username || c.partnerName || 'Soul Connection ✨',
        partnerAvatar: partnerProfile?.avatar_url || c.partnerAvatar,
        callType: c.callType || 'audio',
        direction: isCaller ? 'outgoing' : 'incoming',
        status: c.callStatus || c.status || 'ended',
        durationSeconds: c.durationSeconds || 0,
        createdAt: c.createdAt || new Date().toISOString()
      };
    });
  },

  // =========================================================================
  // CONTACTS & CONNECTIONS
  // =========================================================================
  async getContacts(userId) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact_user:contact_user_id(id, email, username, mobile_number, user_profiles(*))')
        .eq('user_id', userId);

      if (!error && data && data.length > 0) {
        return data.map((c) => ({
          contactId: c.id,
          userId: c.contact_user?.id,
          email: c.contact_user?.email,
          username: c.contact_user?.username,
          mobileNumber: c.contact_user?.mobile_number,
          displayName: c.contact_user?.user_profiles?.display_name || c.contact_user?.username,
          avatarUrl: c.contact_user?.user_profiles?.avatar_url,
          bio: c.contact_user?.user_profiles?.bio,
          onlineStatus: c.contact_user?.user_profiles?.online_status,
          lastSeen: c.contact_user?.user_profiles?.last_seen,
          nickname: c.nickname,
          isFavorite: c.is_favorite
        }));
      }
    } catch (e) {}

    // Fallback store
    if (!fallbackStore.contacts) fallbackStore.contacts = [];
    const userContacts = fallbackStore.contacts.filter((c) => c.user_id === userId);
    return userContacts.map((c) => {
      const targetUser = fallbackStore.users.find((u) => u.id === c.contact_user_id);
      const targetProfile = fallbackStore.profiles.find((p) => p.user_id === c.contact_user_id);
      return {
        contactId: c.id,
        userId: c.contact_user_id,
        email: targetUser?.email,
        username: targetUser?.username,
        mobileNumber: targetUser?.mobile_number,
        displayName: targetProfile?.display_name || targetUser?.username,
        avatarUrl: targetProfile?.avatar_url,
        bio: targetProfile?.bio,
        onlineStatus: targetProfile?.online_status || false,
        lastSeen: targetProfile?.last_seen || 'Recently active',
        nickname: c.nickname,
        isFavorite: c.is_favorite
      };
    });
  },

  async isContact(userId, targetUserId) {
    if (!userId || !targetUserId) return false;
    if (userId === targetUserId) return true; // Self messaging allowed

    // Allow default partner demo in starter mode
    if (targetUserId === 'partner-demo' || userId === 'partner-demo') return true;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('contact_user_id', targetUserId)
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    } catch (e) {}

    // Fallback store
    if (!fallbackStore.contacts) fallbackStore.contacts = [];
    return fallbackStore.contacts.some(
      (c) => c.user_id === userId && c.contact_user_id === targetUserId
    );
  },

  async addContact(userId, contactUserId, nickname = null) {
    try {
      await supabase
        .from('contacts')
        .upsert([{ user_id: userId, contact_user_id: contactUserId, nickname }], {
          onConflict: 'user_id,contact_user_id'
        });
    } catch (e) {}

    if (!fallbackStore.contacts) fallbackStore.contacts = [];
    const existing = fallbackStore.contacts.find((c) => c.user_id === userId && c.contact_user_id === contactUserId);
    if (!existing) {
      fallbackStore.contacts.push({
        id: 'cnt-' + Date.now(),
        user_id: userId,
        contact_user_id: contactUserId,
        nickname,
        is_favorite: false,
        created_at: new Date().toISOString()
      });
    } else {
      if (nickname) existing.nickname = nickname;
    }
    persistFallback();
    return true;
  },

  async updateContact(userId, contactUserId, nickname) {
    try {
      await supabase
        .from('contacts')
        .update({ nickname })
        .eq('user_id', userId)
        .eq('contact_user_id', contactUserId);
    } catch (e) {}

    if (!fallbackStore.contacts) fallbackStore.contacts = [];
    const existing = fallbackStore.contacts.find((c) => c.user_id === userId && c.contact_user_id === contactUserId);
    if (existing) {
      existing.nickname = nickname;
      persistFallback();
    }
    return true;
  },

  async removeContact(userId, contactUserId) {
    try {
      await supabase
        .from('contacts')
        .delete()
        .eq('user_id', userId)
        .eq('contact_user_id', contactUserId);
    } catch (e) {}

    if (!fallbackStore.contacts) fallbackStore.contacts = [];
    fallbackStore.contacts = fallbackStore.contacts.filter(
      (c) => !(c.user_id === userId && c.contact_user_id === contactUserId)
    );
    persistFallback();
    return true;
  },

  // =========================================================================
  // BLOCKED USERS
  // =========================================================================
  async getBlockedUsers(userId) {
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('*, blocked_user:blocked_user_id(id, email, username, user_profiles(display_name, avatar_url))')
        .eq('user_id', userId);

      if (data) return data;
    } catch (e) {}

    if (!fallbackStore.blocked_users) fallbackStore.blocked_users = [];
    return fallbackStore.blocked_users.filter((b) => b.user_id === userId);
  },

  async blockUser(userId, blockedUserId) {
    try {
      await supabase
        .from('blocked_users')
        .insert([{ user_id: userId, blocked_user_id: blockedUserId }]);
    } catch (e) {}

    if (!fallbackStore.blocked_users) fallbackStore.blocked_users = [];
    const exists = fallbackStore.blocked_users.find(
      (b) => b.user_id === userId && b.blocked_user_id === blockedUserId
    );
    if (!exists) {
      fallbackStore.blocked_users.push({
        id: 'blk-' + Date.now(),
        user_id: userId,
        blocked_user_id: blockedUserId,
        created_at: new Date().toISOString()
      });
      persistFallback();
    }
    return true;
  },

  async unblockUser(userId, blockedUserId) {
    try {
      await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', userId)
        .eq('blocked_user_id', blockedUserId);
    } catch (e) {}

    if (!fallbackStore.blocked_users) fallbackStore.blocked_users = [];
    fallbackStore.blocked_users = fallbackStore.blocked_users.filter(
      (b) => !(b.user_id === userId && b.blocked_user_id === blockedUserId)
    );
    persistFallback();
    return true;
  },

  async isUserBlocked(userAId, userBId) {
    if (!fallbackStore.blocked_users) fallbackStore.blocked_users = [];
    return fallbackStore.blocked_users.some(
      (b) =>
        (b.user_id === userAId && b.blocked_user_id === userBId) ||
        (b.user_id === userBId && b.blocked_user_id === userAId)
    );
  },

  // =========================================================================
  // END-TO-END ENCRYPTION (E2EE PUBLIC KEYS)
  // =========================================================================
  async savePublicKey(userId, publicKey) {
    try {
      await supabase.from('encryption_keys').upsert([{
        user_id: userId,
        public_key: publicKey,
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id' });
    } catch (e) {}

    if (!fallbackStore.public_keys) fallbackStore.public_keys = {};
    fallbackStore.public_keys[userId] = publicKey;
    persistFallback();
    return true;
  },

  async getPublicKey(userId) {
    try {
      const { data, error } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data?.public_key) {
        return data.public_key;
      }
    } catch (e) {}

    if (!fallbackStore.public_keys) fallbackStore.public_keys = {};
    return fallbackStore.public_keys[userId] || null;
  },

  // =========================================================================
  // USER SETTINGS & PASSCODE VAULT
  // =========================================================================
  async getUserSettings(userId) {
    const defaultSettings = {
      userId,
      theme: 'romantic-dark',
      soundEnabled: true,
      notificationsEnabled: true,
      callRingtoneEnabled: true,
      lastSeenPrivacy: 'everyone',
      profilePhotoPrivacy: 'everyone',
      aboutPrivacy: 'everyone',
      statusPrivacy: 'contacts',
      readReceipts: true,
      hasPasscode: false
    };

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          ...defaultSettings,
          ...data,
          hasPasscode: !!data.passcode_hash
        };
      }
    } catch (e) {}

    if (!fallbackStore.settings) fallbackStore.settings = [];
    const found = fallbackStore.settings.find(s => s.userId === userId || s.user_id === userId);
    if (found) {
      return {
        ...defaultSettings,
        ...found,
        hasPasscode: !!found.passcodeHash
      };
    }

    return defaultSettings;
  },

  async updateUserSettings(userId, newSettings) {
    if (!fallbackStore.settings) fallbackStore.settings = [];
    let existingIndex = fallbackStore.settings.findIndex(s => s.userId === userId || s.user_id === userId);

    let passcodeHash = null;
    if (newSettings.passcode) {
      passcodeHash = crypto.createHash('sha256').update(newSettings.passcode).digest('hex');
    }

    const updated = {
      ...(existingIndex >= 0 ? fallbackStore.settings[existingIndex] : {}),
      userId,
      ...newSettings,
      updatedAt: new Date().toISOString()
    };

    if (passcodeHash) {
      updated.passcodeHash = passcodeHash;
      delete updated.passcode;
    }

    if (existingIndex >= 0) {
      fallbackStore.settings[existingIndex] = updated;
    } else {
      fallbackStore.settings.push(updated);
    }
    persistFallback();

    try {
      await supabase.from('user_settings').upsert([{
        user_id: userId,
        theme: updated.theme,
        sound_enabled: updated.soundEnabled,
        notifications_enabled: updated.notificationsEnabled,
        call_ringtone_enabled: updated.callRingtoneEnabled,
        last_seen_privacy: updated.lastSeenPrivacy,
        profile_photo_privacy: updated.profilePhotoPrivacy,
        about_privacy: updated.aboutPrivacy,
        status_privacy: updated.statusPrivacy,
        read_receipts: updated.readReceipts,
        ...(passcodeHash ? { passcode_hash: passcodeHash } : {}),
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id' });
    } catch (e) {}

    return { ...updated, hasPasscode: !!updated.passcodeHash };
  },

  async verifyUserPasscode(userId, passcode) {
    if (!passcode) return false;
    const hash = crypto.createHash('sha256').update(passcode).digest('hex');

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('passcode_hash')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data?.passcode_hash) {
        return data.passcode_hash === hash;
      }
    } catch (e) {}

    if (!fallbackStore.settings) fallbackStore.settings = [];
    const found = fallbackStore.settings.find(s => s.userId === userId || s.user_id === userId);
    return found?.passcodeHash === hash;
  },

  // =========================================================================
  // ONLINE PRESENCE & LAST SEEN
  // =========================================================================
  async updateOnlinePresence(userId, isOnline, lastSeen = null) {
    const updateData = {
      online_status: isOnline,
      last_seen: lastSeen || new Date().toISOString()
    };

    try {
      await supabase.from('user_profiles').update(updateData).eq('user_id', userId);
    } catch (e) {}

    const prof = fallbackStore.profiles.find((p) => p.user_id === userId);
    if (prof) {
      prof.online_status = isOnline;
      prof.last_seen = updateData.last_seen;
      persistFallback();
    }
    return true;
  }
};

export default db;
