import crypto from 'crypto';
import supabase from '../config/supabase.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function normalizeProfileJoin(profileField) {
  if (!profileField) return null;
  return Array.isArray(profileField) ? profileField[0] || null : profileField;
}

function assertNoError(error, context) {
  if (error) {
    const err = new Error(`${context}: ${error.message}`);
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
}

function escapeIlike(str) {
  return str.replace(/[\\%_]/g, '\\$&');
}

function sanitizeUsernameBase(raw) {
  const cleaned = (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (cleaned.length >= 3) return cleaned.slice(0, 40);
  return `soul_${crypto.randomBytes(3).toString('hex')}`;
}

export const db = {
  // =========================================================================
  // USERS, PROFILES & IDENTIFIERS (Supabase PostgreSQL ONLY)
  // =========================================================================
  async findUserById(userId) {
    if (!isUuid(userId)) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*, user_profiles(*)')
      .eq('id', userId)
      .maybeSingle();

    assertNoError(error, 'findUserById failed');
    if (!data) return null;
    return { ...data, user_profiles: normalizeProfileJoin(data.user_profiles) };
  },

  async findUserByFirebaseUid(firebaseUid) {
    if (!firebaseUid) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*, user_profiles(*)')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    assertNoError(error, 'findUserByFirebaseUid failed');
    if (!data) return null;
    return { ...data, user_profiles: normalizeProfileJoin(data.user_profiles) };
  },

  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*, user_profiles(*)')
      .eq('email', normalized)
      .maybeSingle();

    assertNoError(error, 'findUserByEmail failed');
    if (!data) return null;
    return { ...data, user_profiles: normalizeProfileJoin(data.user_profiles) };
  },

  async findUserByIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    const rawTrimmed = identifier.trim();
    const normalized = rawTrimmed.toLowerCase().replace(/^@/, '');
    if (!normalized) return null;

    if (isUuid(rawTrimmed)) {
      return this.findUserById(rawTrimmed);
    }

    // 1. Fast lookup via user_identifiers
    const { data: idRow, error: idError } = await supabase
      .from('user_identifiers')
      .select('user_id')
      .eq('identifier_value', normalized)
      .maybeSingle();

    assertNoError(idError, 'findUserByIdentifier(user_identifiers) failed');
    if (idRow?.user_id) {
      const found = await this.findUserById(idRow.user_id);
      if (found) return found;
    }

    // 2. Direct lookup on users table using safe parameterized .eq() calls
    if (normalized.includes('@')) {
      return this.findUserByEmail(normalized);
    }

    const { data: byUsername, error: userErr } = await supabase
      .from('users')
      .select('*, user_profiles(*)')
      .eq('username', normalized)
      .maybeSingle();
    assertNoError(userErr, 'findUserByIdentifier(username) failed');
    if (byUsername) {
      return { ...byUsername, user_profiles: normalizeProfileJoin(byUsername.user_profiles) };
    }

    const { data: byMobile, error: mobErr } = await supabase
      .from('users')
      .select('*, user_profiles(*)')
      .eq('mobile_number', rawTrimmed)
      .maybeSingle();
    assertNoError(mobErr, 'findUserByIdentifier(mobile) failed');
    if (byMobile) {
      return { ...byMobile, user_profiles: normalizeProfileJoin(byMobile.user_profiles) };
    }

    return null;
  },

  async checkAvailability({ email, username, mobile }) {
    if (email) {
      const existingEmail = await this.findUserByEmail(email);
      if (existingEmail) {
        return {
          available: false,
          field: 'email',
          code: 'EMAIL_ALREADY_IN_USE',
          message: 'An account with this email address already exists. Please sign in or reset your password.'
        };
      }
    }

    if (username) {
      const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
      const { data: existingUsername, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', cleanUser)
        .maybeSingle();
      assertNoError(error, 'checkAvailability(username) failed');
      if (existingUsername) {
        return { available: false, field: 'username', message: 'Username is already taken.' };
      }
    }

    if (mobile) {
      const cleanMobile = mobile.trim();
      const { data: existingMobile, error } = await supabase
        .from('users')
        .select('id')
        .eq('mobile_number', cleanMobile)
        .maybeSingle();
      assertNoError(error, 'checkAvailability(mobile) failed');
      if (existingMobile) {
        return { available: false, field: 'mobile', message: 'Mobile number is already registered.' };
      }
    }

    return { available: true };
  },

  async syncUserIdentifiers(user) {
    if (!user?.id) return;

    const pairs = [];
    if (user.email) {
      pairs.push({
        user_id: user.id,
        identifier_type: 'email',
        identifier_value: user.email.toLowerCase().trim(),
        is_verified: Boolean(user.email_verified)
      });
    }
    if (user.username) {
      pairs.push({
        user_id: user.id,
        identifier_type: 'username',
        identifier_value: user.username.toLowerCase().trim(),
        is_verified: true
      });
    }
    if (user.mobile_number) {
      pairs.push({
        user_id: user.id,
        identifier_type: 'mobile',
        identifier_value: user.mobile_number.trim(),
        is_verified: false
      });
    }

    for (const entry of pairs) {
      // Remove stale identifier of same type owned by this user if value changed
      await supabase
        .from('user_identifiers')
        .delete()
        .eq('user_id', user.id)
        .eq('identifier_type', entry.identifier_type)
        .neq('identifier_value', entry.identifier_value);

      const { error } = await supabase
        .from('user_identifiers')
        .upsert([entry], { onConflict: 'identifier_type,identifier_value' });
      assertNoError(error, `syncUserIdentifiers(${entry.identifier_type}) failed`);
    }
  },

  async ensureUniqueUsername(desiredUsername, email) {
    const base = sanitizeUsernameBase(desiredUsername || email?.split('@')[0]);
    let candidate = base;

    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', candidate)
        .maybeSingle();
      assertNoError(error, 'ensureUniqueUsername failed');
      if (!data) return candidate;

      // If caller explicitly supplied a custom username on signup and it collides, fail clearly
      if (attempt === 0 && desiredUsername && desiredUsername.trim().toLowerCase() === base) {
        const err = new Error('Username is already taken.');
        err.code = 'USERNAME_TAKEN';
        throw err;
      }

      const suffix = crypto.randomBytes(2).toString('hex');
      candidate = `${base.slice(0, 40)}_${suffix}`;
    }

    return `${base.slice(0, 32)}_${Date.now().toString().slice(-6)}`;
  },

  /**
   * Idempotent synchronization of an authenticated Firebase user into Supabase.
   * Creates or links `users`, `user_profiles`, `user_settings`, and `user_identifiers`.
   */
  async syncFirebaseUser({
    firebaseUid,
    email,
    emailVerified = false,
    displayName,
    username,
    mobileNumber = null,
    photoURL = null
  }) {
    if (!firebaseUid || !email) {
      throw new Error('Verified firebaseUid and email are required for synchronization.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanMobile = mobileNumber ? mobileNumber.trim() : null;

    // 1. Locate existing user by firebase_uid first, then email
    let userRow = await this.findUserByFirebaseUid(firebaseUid);
    if (!userRow) {
      userRow = await this.findUserByEmail(cleanEmail);
      if (userRow) {
        if (userRow.firebase_uid && userRow.firebase_uid !== firebaseUid) {
          const conflictErr = new Error('This email is already linked to a different Firebase identity.');
          conflictErr.code = 'FIREBASE_UID_MISMATCH';
          throw conflictErr;
        }
        // Link firebase_uid to existing user record
        const { data: updatedUser, error: linkErr } = await supabase
          .from('users')
          .update({
            firebase_uid: firebaseUid,
            email_verified: Boolean(emailVerified || userRow.email_verified),
            updated_at: new Date().toISOString()
          })
          .eq('id', userRow.id)
          .select()
          .single();
        assertNoError(linkErr, 'syncFirebaseUser(link firebase_uid) failed');
        userRow = { ...updatedUser, user_profiles: userRow.user_profiles };
      }
    }

    // 2. Create user if not found
    if (!userRow) {
      const uniqueUsername = await this.ensureUniqueUsername(username, cleanEmail);
      const newUserId = crypto.randomUUID();

      const { data: insertedUser, error: insertErr } = await supabase
        .from('users')
        .insert([{
          id: newUserId,
          firebase_uid: firebaseUid,
          email: cleanEmail,
          email_verified: Boolean(emailVerified),
          username: uniqueUsername,
          mobile_number: cleanMobile,
          status: 'active'
        }])
        .select()
        .single();

      assertNoError(insertErr, 'syncFirebaseUser(insert users) failed');
      userRow = insertedUser;
    } else if (emailVerified && !userRow.email_verified) {
      const { data: verifiedUser, error: verErr } = await supabase
        .from('users')
        .update({ email_verified: true, updated_at: new Date().toISOString() })
        .eq('id', userRow.id)
        .select()
        .single();
      assertNoError(verErr, 'syncFirebaseUser(update email_verified) failed');
      userRow = { ...verifiedUser, user_profiles: userRow.user_profiles };
    }

    // 3. Ensure user_profiles exists / restore if missing
    let profileRow = normalizeProfileJoin(userRow.user_profiles);
    if (!profileRow) {
      const { data: existingProfile, error: profFetchErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userRow.id)
        .maybeSingle();
      assertNoError(profFetchErr, 'syncFirebaseUser(fetch profile) failed');
      profileRow = existingProfile;
    }

    const defaultAvatar =
      photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUid}`;
    const resolvedDisplayName =
      displayName?.trim() || userRow.username || cleanEmail.split('@')[0];

    if (!profileRow) {
      const { data: insertedProfile, error: profInsertErr } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: userRow.id,
          display_name: resolvedDisplayName,
          avatar_url: defaultAvatar,
          bio: 'In a love story written by the stars ✨',
          relationship_status: 'In a soul bond'
        }])
        .select()
        .single();
      assertNoError(profInsertErr, 'syncFirebaseUser(insert user_profiles) failed');
      profileRow = insertedProfile;
    }

    // 4. Ensure user_settings exists
    const { data: existingSettings, error: setCheckErr } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userRow.id)
      .maybeSingle();
    assertNoError(setCheckErr, 'syncFirebaseUser(check user_settings) failed');

    if (!existingSettings) {
      const { error: setInsertErr } = await supabase
        .from('user_settings')
        .insert([{ user_id: userRow.id }]);
      assertNoError(setInsertErr, 'syncFirebaseUser(insert user_settings) failed');
    }

    // 5. Ensure user_identifiers are populated
    await this.syncUserIdentifiers(userRow);

    return {
      user: { ...userRow, user_profiles: profileRow },
      profile: profileRow
    };
  },

  async updateUserProfile(userId, updateData) {
    if (!isUuid(userId)) {
      throw new Error('Invalid user UUID.');
    }

    const userUpdates = {};
    if (typeof updateData.username === 'string' && updateData.username.trim()) {
      userUpdates.username = updateData.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    }
    if (updateData.mobile !== undefined) {
      userUpdates.mobile_number = updateData.mobile ? updateData.mobile.trim() : null;
    }

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();
      const { data: updatedUser, error: uErr } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId)
        .select()
        .single();
      assertNoError(uErr, 'updateUserProfile(users) failed');
      await this.syncUserIdentifiers(updatedUser);
    }

    const profileUpdates = {
      updated_at: new Date().toISOString()
    };
    if (updateData.display_name !== undefined) profileUpdates.display_name = updateData.display_name;
    if (updateData.avatar_url !== undefined) profileUpdates.avatar_url = updateData.avatar_url;
    if (updateData.bio !== undefined) profileUpdates.bio = updateData.bio;
    if (updateData.relationship_status !== undefined) {
      profileUpdates.relationship_status = updateData.relationship_status;
    }
    if (updateData.anniversary_date !== undefined) {
      profileUpdates.anniversary_date = updateData.anniversary_date || null;
    }

    const { error: pErr } = await supabase
      .from('user_profiles')
      .update(profileUpdates)
      .eq('user_id', userId);
    assertNoError(pErr, 'updateUserProfile(user_profiles) failed');

    return true;
  },

  async searchUsers(query, excludeUserId = null) {
    const raw = (query || '').trim().replace(/^@/, '');
    if (!raw) return [];

    // Direct UUID lookup
    if (isUuid(raw)) {
      const found = await this.findUserById(raw);
      if (!found || found.id === excludeUserId) return [];
      return [{
        id: found.id,
        username: found.username,
        displayName: found.user_profiles?.display_name || found.username,
        avatarUrl: found.user_profiles?.avatar_url || null,
        bio: found.user_profiles?.bio || 'In a love story written by the stars ✨',
        onlineStatus: Boolean(found.user_profiles?.online_status)
      }];
    }

    const pattern = `%${escapeIlike(raw.toLowerCase())}%`;

    // Search by username (never searches or exposes private email/mobile)
    const { data: byUsername, error: err1 } = await supabase
      .from('users')
      .select('id, username, user_profiles(display_name, avatar_url, bio, online_status)')
      .ilike('username', pattern)
      .limit(20);
    assertNoError(err1, 'searchUsers(username) failed');

    // Also search by display_name
    const { data: byDisplayName, error: err2 } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar_url, bio, online_status, users!user_profiles_user_id_fkey(id, username)')
      .ilike('display_name', pattern)
      .limit(20);
    assertNoError(err2, 'searchUsers(display_name) failed');

    const map = new Map();
    for (const u of byUsername || []) {
      if (u.id === excludeUserId) continue;
      const prof = normalizeProfileJoin(u.user_profiles);
      map.set(u.id, {
        id: u.id,
        username: u.username,
        displayName: prof?.display_name || u.username,
        avatarUrl: prof?.avatar_url || null,
        bio: prof?.bio || 'In a love story written by the stars ✨',
        onlineStatus: Boolean(prof?.online_status)
      });
    }

    for (const p of byDisplayName || []) {
      const uid = p.user_id;
      if (!uid || uid === excludeUserId || map.has(uid)) continue;
      const usr = Array.isArray(p.users) ? p.users[0] : p.users;
      map.set(uid, {
        id: uid,
        username: usr?.username || 'user',
        displayName: p.display_name || usr?.username || 'Soul Member',
        avatarUrl: p.avatar_url || null,
        bio: p.bio || 'In a love story written by the stars ✨',
        onlineStatus: Boolean(p.online_status)
      });
    }

    return Array.from(map.values()).slice(0, 20);
  },

  // =========================================================================
  // OTP VERIFICATIONS
  // =========================================================================
  async saveOtp(email, otpHash, purpose, expiresAt) {
    const { data, error } = await supabase
      .from('otp_verifications')
      .insert([{
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        otp_hash: otpHash,
        purpose,
        expires_at: expiresAt,
        is_used: false
      }])
      .select()
      .single();

    assertNoError(error, 'saveOtp failed');
    return data;
  },

  async getLatestOtp(email, purpose) {
    const { data, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('purpose', purpose)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    assertNoError(error, 'getLatestOtp failed');
    return data;
  },

  async markOtpUsed(otpId) {
    const { error } = await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', otpId);

    assertNoError(error, 'markOtpUsed failed');
    return true;
  },

  // =========================================================================
  // TERMS ACCEPTANCE
  // =========================================================================
  async recordTermsAcceptance(data) {
    const payload = {
      id: crypto.randomUUID(),
      user_id: isUuid(data.user_id) ? data.user_id : null,
      ip_address: data.ip_address || null,
      terms_version: data.terms_version || 'v1.0.0',
      privacy_version: data.privacy_version || 'v1.0.0',
      accepted_at: data.accepted_at || new Date().toISOString()
    };

    const { error } = await supabase.from('terms_acceptance').insert([payload]);
    assertNoError(error, 'recordTermsAcceptance failed');
    return true;
  },

  // =========================================================================
  // CONVERSATIONS & CONVERSATION MEMBERS
  // =========================================================================
  async findDirectConversationBetween(userAId, userBId) {
    if (!isUuid(userAId) || !isUuid(userBId)) return null;

    const { data: myMemberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, conversations!inner(id, type, title, last_message_text, last_message_at, created_at)')
      .eq('user_id', userAId)
      .eq('conversations.type', 'direct');

    assertNoError(memErr, 'findDirectConversationBetween(A) failed');
    if (!myMemberships || myMemberships.length === 0) return null;

    const convIds = myMemberships.map((m) => m.conversation_id);
    const { data: partnerMatch, error: pErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userBId)
      .in('conversation_id', convIds)
      .limit(1)
      .maybeSingle();

    assertNoError(pErr, 'findDirectConversationBetween(B) failed');
    if (!partnerMatch) return null;

    return this.getConversationById(partnerMatch.conversation_id, userAId);
  },

  async getConversationsForUser(userId) {
    if (!isUuid(userId)) return [];

    const { data: memberships, error } = await supabase
      .from('conversation_members')
      .select('conversation_id, unread_count, is_archived, is_pinned, is_muted, conversations(*)')
      .eq('user_id', userId);

    assertNoError(error, 'getConversationsForUser failed');
    if (!memberships || memberships.length === 0) return [];

    const convIds = memberships.map((m) => m.conversation_id);
    const { data: allMembers, error: mErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, users(id, username, user_profiles(display_name, avatar_url, online_status, last_seen))')
      .in('conversation_id', convIds);
    assertNoError(mErr, 'getConversationsForUser(members) failed');

    const { data: userContacts, error: cErr } = await supabase
      .from('contacts')
      .select('contact_user_id, nickname')
      .eq('user_id', userId);
    assertNoError(cErr, 'getConversationsForUser(contacts) failed');

    const nicknameMap = new Map((userContacts || []).map((c) => [c.contact_user_id, c.nickname]));
    const membersByConv = new Map();
    for (const row of allMembers || []) {
      if (!membersByConv.has(row.conversation_id)) {
        membersByConv.set(row.conversation_id, []);
      }
      membersByConv.get(row.conversation_id).push(row);
    }

    const result = memberships.map((m) => {
      const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations;
      const participants = membersByConv.get(m.conversation_id) || [];
      const isGroup = conv?.type === 'group';
      const partnerEntry = !isGroup
        ? participants.find((p) => p.user_id !== userId) || participants[0]
        : null;
      const partnerUser = partnerEntry?.users
        ? (Array.isArray(partnerEntry.users) ? partnerEntry.users[0] : partnerEntry.users)
        : null;
      const partnerProfile = normalizeProfileJoin(partnerUser?.user_profiles);

      const partnerId = partnerUser?.id || partnerEntry?.user_id || null;
      const partnerNickname = partnerId ? nicknameMap.get(partnerId) : null;

      return {
        id: m.conversation_id,
        type: conv?.type || 'direct',
        isGroup,
        name: isGroup
          ? (conv?.title || 'Romantic Group')
          : (partnerNickname || partnerProfile?.display_name || partnerUser?.username || conv?.title || 'Soul Partner'),
        avatarUrl: isGroup
          ? `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(conv?.title || m.conversation_id)}`
          : (partnerProfile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${partnerId || m.conversation_id}`),
        partnerId,
        online: Boolean(partnerProfile?.online_status),
        lastSeen: partnerProfile?.online_status ? 'Online' : (partnerProfile?.last_seen || 'Recently active'),
        members: participants.map((p) => p.user_id),
        lastMessageText: conv?.last_message_text || 'Say hi! 💕',
        lastMessageAt: conv?.last_message_at || conv?.created_at,
        unreadCount: m.unread_count || 0,
        createdAt: conv?.created_at
      };
    });

    result.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
    return result;
  },

  async getConversationById(conversationId, viewerUserId = null) {
    if (!isUuid(conversationId)) return null;

    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_members(*)')
      .eq('id', conversationId)
      .maybeSingle();

    assertNoError(error, 'getConversationById failed');
    if (!data) return null;

    const members = (data.conversation_members || []).map((m) => m.user_id);
    const partnerId = data.type === 'direct'
      ? (viewerUserId ? members.find((id) => id !== viewerUserId) : members[0]) || null
      : null;

    return {
      id: data.id,
      type: data.type,
      name: data.title,
      isGroup: data.type === 'group',
      partnerId,
      members,
      lastMessageText: data.last_message_text,
      lastMessageAt: data.last_message_at,
      createdAt: data.created_at
    };
  },

  async isConversationMember(userId, conversationId) {
    if (!isUuid(userId) || !isUuid(conversationId)) return false;

    const { data, error } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    assertNoError(error, 'isConversationMember failed');
    return Boolean(data);
  },

  async createConversation(convData) {
    const type = convData.type || 'direct';

    if (type === 'direct' && isUuid(convData.creatorId) && isUuid(convData.partnerId)) {
      const existing = await this.findDirectConversationBetween(convData.creatorId, convData.partnerId);
      if (existing) return existing;
    }

    const convId = isUuid(convData.id) ? convData.id : crypto.randomUUID();
    const now = new Date().toISOString();
    const title = convData.name || convData.title || (type === 'group' ? 'Romantic Group' : 'Direct Chat');
    const lastMessageText = convData.lastMessageText || 'Say hi! 💕';

    const { data: inserted, error: convErr } = await supabase
      .from('conversations')
      .insert([{
        id: convId,
        type,
        title,
        last_message_text: lastMessageText,
        last_message_at: now
      }])
      .select()
      .single();

    assertNoError(convErr, 'createConversation failed');

    const memberIds = Array.from(
      new Set([convData.creatorId, convData.partnerId, ...(convData.members || [])].filter(isUuid))
    );

    if (memberIds.length > 0) {
      const memberRows = memberIds.map((uid) => ({
        id: crypto.randomUUID(),
        conversation_id: inserted.id,
        user_id: uid
      }));
      const { error: memErr } = await supabase
        .from('conversation_members')
        .upsert(memberRows, { onConflict: 'conversation_id,user_id' });
      assertNoError(memErr, 'createConversation(members) failed');
    }

    return {
      id: inserted.id,
      type: inserted.type,
      name: title,
      avatarUrl: convData.avatarUrl || null,
      isGroup: type === 'group',
      description: convData.description || null,
      creatorId: convData.creatorId || null,
      partnerId: type === 'direct' ? convData.partnerId || null : null,
      members: memberIds,
      lastMessageText: inserted.last_message_text,
      lastMessageAt: inserted.last_message_at,
      unreadCount: 0,
      createdAt: inserted.created_at
    };
  },

  // =========================================================================
  // MESSAGES, REACTIONS & DELETIONS
  // =========================================================================
  async saveMessage(msg) {
    if (!isUuid(msg.conversationId)) {
      throw new Error('Valid conversation UUID is required.');
    }
    if (!isUuid(msg.senderId)) {
      throw new Error('Valid sender UUID is required.');
    }

    const msgId = isUuid(msg.id) ? msg.id : crypto.randomUUID();
    const createdAt = msg.createdAt || new Date().toISOString();

    const row = {
      id: msgId,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      reply_to_id: isUuid(msg.replyToId) ? msg.replyToId : null,
      message_type: msg.messageType || 'text',
      content: msg.content || null,
      media_url: msg.mediaUrl || null,
      audio_url: msg.audioUrl || null,
      file_name: msg.fileName || null,
      file_size: msg.fileSize ? Number(msg.fileSize) : null,
      mega_file_handle: msg.megaFileHandle || null,
      mega_download_url: msg.megaDownloadUrl || null,
      delivery_status: msg.deliveryStatus || 'sent',
      created_at: createdAt
    };

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert([row])
      .select()
      .single();

    assertNoError(error, 'saveMessage failed');

    const snippet =
      row.message_type === 'audio'
        ? 'Voice Message 🎙️'
        : row.message_type === 'image'
          ? 'Photo 📷'
          : row.message_type === 'video'
            ? 'Video 🎬'
            : row.message_type === 'file'
              ? `Attachment: ${row.file_name || 'File'}`
              : (typeof row.content === 'string' && row.content.includes('"isEncrypted":true')
                  ? '🔒 Encrypted message'
                  : (row.content || 'New message'));

    await supabase
      .from('conversations')
      .update({
        last_message_text: snippet,
        last_message_at: createdAt
      })
      .eq('id', row.conversation_id);

    return {
      id: inserted.id,
      conversationId: inserted.conversation_id,
      senderId: inserted.sender_id,
      senderName: msg.senderName || null,
      replyToId: inserted.reply_to_id,
      replyToText: msg.replyToText || null,
      messageType: inserted.message_type,
      content: inserted.content,
      mediaUrl: inserted.media_url,
      audioUrl: inserted.audio_url,
      fileName: inserted.file_name,
      fileSize: inserted.file_size,
      megaFileHandle: inserted.mega_file_handle,
      megaDownloadUrl: inserted.mega_download_url,
      deliveryStatus: inserted.delivery_status,
      isDeletedForAll: inserted.is_deleted_for_all,
      createdAt: inserted.created_at
    };
  },

  async getMessages(conversationId) {
    if (!isUuid(conversationId)) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*, message_reactions(user_id, reaction)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    assertNoError(error, 'getMessages failed');

    return (data || []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      replyToId: m.reply_to_id,
      messageType: m.message_type,
      content: m.content,
      mediaUrl: m.media_url,
      audioUrl: m.audio_url,
      fileName: m.file_name,
      fileSize: m.file_size,
      megaFileHandle: m.mega_file_handle,
      megaDownloadUrl: m.mega_download_url,
      isEdited: m.is_edited,
      isDeletedForAll: m.is_deleted_for_all,
      deliveryStatus: m.delivery_status,
      reaction: m.message_reactions?.[0]?.reaction || null,
      reactions: m.message_reactions || [],
      createdAt: m.created_at
    }));
  },

  async reactToMessage(messageId, userId, reaction) {
    if (!isUuid(messageId) || !isUuid(userId)) {
      throw new Error('Valid messageId and userId UUIDs required.');
    }

    const { error } = await supabase
      .from('message_reactions')
      .upsert(
        [{ id: crypto.randomUUID(), message_id: messageId, user_id: userId, reaction }],
        { onConflict: 'message_id,user_id' }
      );
    assertNoError(error, 'reactToMessage failed');
    return true;
  },

  async deleteMessage(messageId, userId, deleteForEveryone = false) {
    if (!isUuid(messageId)) throw new Error('Valid messageId UUID required.');

    if (deleteForEveryone) {
      let query = supabase
        .from('messages')
        .update({
          content: '🚫 This message was deleted.',
          is_deleted_for_all: true,
          media_url: null,
          audio_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (isUuid(userId)) query = query.eq('sender_id', userId);
      const { error } = await query;
      assertNoError(error, 'deleteMessage(forAll) failed');
    } else {
      let query = supabase.from('messages').delete().eq('id', messageId);
      if (isUuid(userId)) query = query.eq('sender_id', userId);
      const { error } = await query;
      assertNoError(error, 'deleteMessage failed');
    }

    return true;
  },

  // =========================================================================
  // STATUSES (24-Hour Ephemeral Stories)
  // =========================================================================
  async saveStatus(status) {
    if (!isUuid(status.userId)) throw new Error('Valid userId UUID required for status.');

    const row = {
      id: isUuid(status.id) ? status.id : crypto.randomUUID(),
      user_id: status.userId,
      status_type: status.type || status.statusType || 'text',
      content: status.content || null,
      media_url: status.mediaUrl || null,
      mega_file_handle: status.megaFileHandle || null,
      caption: status.caption || null,
      background_color: status.gradient || status.backgroundColor || '#2e0854',
      font_family: status.fontFamily || 'default',
      views_count: 0,
      expires_at: status.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: status.createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('statuses')
      .insert([row])
      .select()
      .single();
    assertNoError(error, 'saveStatus failed');

    return {
      id: data.id,
      userId: data.user_id,
      userName: status.userName || 'Soul User',
      userAvatar: status.userAvatar || null,
      type: data.status_type,
      content: data.content,
      gradient: data.background_color,
      mediaUrl: data.media_url,
      caption: data.caption,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      viewsCount: data.views_count || 0,
      viewers: []
    };
  },

  async getStatuses(userId) {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('statuses')
      .select('*, users:user_id(id, username, user_profiles(*)), status_views(*)')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    assertNoError(error, 'getStatuses failed');

    const allStatuses = (data || []).map((s) => {
      const usr = Array.isArray(s.users) ? s.users[0] : s.users;
      const prof = normalizeProfileJoin(usr?.user_profiles);
      return {
        id: s.id,
        userId: s.user_id,
        userName: prof?.display_name || usr?.username || 'Partner',
        userAvatar: prof?.avatar_url || null,
        type: s.status_type || 'text',
        content: s.content,
        gradient: s.background_color,
        mediaUrl: s.media_url,
        caption: s.caption,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        viewsCount: s.status_views?.length || s.views_count || 0,
        viewers: (s.status_views || []).map((v) => v.viewer_id)
      };
    });

    const myStatuses = userId ? allStatuses.filter((s) => s.userId === userId) : [];
    const otherStatuses = userId ? allStatuses.filter((s) => s.userId !== userId) : allStatuses;

    return { statuses: otherStatuses, myStatuses };
  },

  async markStatusViewed(statusId, viewerId) {
    if (!isUuid(statusId) || !isUuid(viewerId)) return null;

    const { error } = await supabase
      .from('status_views')
      .upsert(
        [{ id: crypto.randomUUID(), status_id: statusId, viewer_id: viewerId, viewed_at: new Date().toISOString() }],
        { onConflict: 'status_id,viewer_id' }
      );
    assertNoError(error, 'markStatusViewed failed');

    const { count } = await supabase
      .from('status_views')
      .select('id', { count: 'exact', head: true })
      .eq('status_id', statusId);

    if (typeof count === 'number') {
      await supabase.from('statuses').update({ views_count: count }).eq('id', statusId);
    }

    return { id: statusId, viewsCount: count || 0 };
  },

  async deleteStatus(statusId, userId = null) {
    if (!isUuid(statusId)) return true;
    let query = supabase.from('statuses').delete().eq('id', statusId);
    if (isUuid(userId)) query = query.eq('user_id', userId);
    const { error } = await query;
    assertNoError(error, 'deleteStatus failed');
    return true;
  },

  // =========================================================================
  // MEMORY VAULT (MEGA Cloud Storage Metadata in Supabase)
  // =========================================================================
  async getOrCreateDefaultMemorySpace(userId) {
    if (!isUuid(userId)) throw new Error('Valid userId UUID required for Memory Vault.');

    const { data: membership, error: memErr } = await supabase
      .from('memory_members')
      .select('space_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    assertNoError(memErr, 'getOrCreateDefaultMemorySpace(lookup) failed');

    if (membership?.space_id) return membership.space_id;

    const spaceId = crypto.randomUUID();
    const { error: spaceErr } = await supabase
      .from('memory_spaces')
      .insert([{
        id: spaceId,
        name: 'Our Romantic Vault',
        created_by: userId
      }]);
    assertNoError(spaceErr, 'getOrCreateDefaultMemorySpace(create space) failed');

    const { error: addMemErr } = await supabase
      .from('memory_members')
      .insert([{
        id: crypto.randomUUID(),
        space_id: spaceId,
        user_id: userId,
        access_level: 'admin'
      }]);
    assertNoError(addMemErr, 'getOrCreateDefaultMemorySpace(add member) failed');

    return spaceId;
  },

  async getOrCreateAlbum(spaceId, albumName) {
    if (!albumName || albumName === 'All Memories') return null;

    const { data: existing, error: findErr } = await supabase
      .from('memory_albums')
      .select('id')
      .eq('space_id', spaceId)
      .eq('name', albumName)
      .maybeSingle();
    assertNoError(findErr, 'getOrCreateAlbum(find) failed');
    if (existing) return existing.id;

    const { data: created, error: createErr } = await supabase
      .from('memory_albums')
      .insert([{ id: crypto.randomUUID(), space_id: spaceId, name: albumName }])
      .select('id')
      .single();
    assertNoError(createErr, 'getOrCreateAlbum(create) failed');
    return created.id;
  },

  async saveMemory(memory) {
    if (!isUuid(memory.uploaderId)) throw new Error('Valid uploaderId UUID required.');

    const spaceId = isUuid(memory.spaceId)
      ? memory.spaceId
      : await this.getOrCreateDefaultMemorySpace(memory.uploaderId);
    const albumId = await this.getOrCreateAlbum(spaceId, memory.album);

    const row = {
      id: isUuid(memory.id) ? memory.id : crypto.randomUUID(),
      space_id: spaceId,
      album_id: albumId,
      uploader_id: memory.uploaderId,
      file_name: memory.fileName,
      file_type: memory.fileType || 'document',
      file_size: Number(memory.fileSize || 0),
      mime_type: memory.mimeType || null,
      mega_file_handle: memory.megaFileHandle || null,
      mega_download_url: memory.megaDownloadUrl || null,
      thumbnail_url: memory.thumbnailUrl || null,
      caption: memory.caption || null,
      memory_date: memory.memoryDate || new Date().toISOString().split('T')[0],
      feelings_tag: memory.feelingsTag || null
    };

    const { data, error } = await supabase
      .from('memory_files')
      .insert([row])
      .select()
      .single();
    assertNoError(error, 'saveMemory failed');

    return {
      id: data.id,
      spaceId: data.space_id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      megaFileHandle: data.mega_file_handle,
      megaDownloadUrl: data.mega_download_url,
      megaPublicUrl: memory.megaPublicUrl || data.mega_download_url,
      caption: data.caption,
      memoryDate: data.memory_date,
      feelingsTag: data.feelings_tag,
      album: memory.album || 'All Memories',
      uploaderId: data.uploader_id,
      uploaderName: memory.uploaderName || 'Soul Partner',
      createdAt: data.created_at
    };
  },

  async getMemories(userId) {
    if (!isUuid(userId)) return [];

    const { data: memberships, error: memErr } = await supabase
      .from('memory_members')
      .select('space_id')
      .eq('user_id', userId);
    assertNoError(memErr, 'getMemories(spaces) failed');

    const spaceIds = (memberships || []).map((m) => m.space_id);
    if (spaceIds.length === 0) return [];

    const { data, error } = await supabase
      .from('memory_files')
      .select('*, memory_albums(name), uploader:uploader_id(id, username, user_profiles(display_name))')
      .in('space_id', spaceIds)
      .order('created_at', { ascending: false });
    assertNoError(error, 'getMemories failed');

    return (data || []).map((m) => {
      const album = Array.isArray(m.memory_albums) ? m.memory_albums[0] : m.memory_albums;
      const uploader = Array.isArray(m.uploader) ? m.uploader[0] : m.uploader;
      const uploaderProf = normalizeProfileJoin(uploader?.user_profiles);

      return {
        id: m.id,
        spaceId: m.space_id,
        fileName: m.file_name,
        fileType: m.file_type,
        fileSize: m.file_size,
        mimeType: m.mime_type,
        megaFileHandle: m.mega_file_handle,
        megaDownloadUrl: m.mega_download_url,
        caption: m.caption,
        memoryDate: m.memory_date,
        feelingsTag: m.feelings_tag,
        album: album?.name || 'All Memories',
        uploaderId: m.uploader_id,
        uploaderName: uploaderProf?.display_name || uploader?.username || 'Soul Partner',
        createdAt: m.created_at
      };
    });
  },

  async getMemoryById(memoryId) {
    if (!isUuid(memoryId)) return null;
    const { data, error } = await supabase
      .from('memory_files')
      .select('*')
      .eq('id', memoryId)
      .maybeSingle();
    assertNoError(error, 'getMemoryById failed');
    if (!data) return null;
    return {
      id: data.id,
      spaceId: data.space_id,
      uploaderId: data.uploader_id,
      megaFileHandle: data.mega_file_handle
    };
  },

  async deleteMemory(memoryId, userId = null) {
    if (!isUuid(memoryId)) return true;
    let query = supabase.from('memory_files').delete().eq('id', memoryId);
    if (isUuid(userId)) query = query.eq('uploader_id', userId);
    const { error } = await query;
    assertNoError(error, 'deleteMemory failed');
    return true;
  },

  // =========================================================================
  // CALLS
  // =========================================================================
  async saveCallLog(callData) {
    if (!isUuid(callData.callerId) || !isUuid(callData.receiverId)) {
      throw new Error('Valid callerId and receiverId UUIDs required.');
    }

    const row = {
      id: isUuid(callData.id) ? callData.id : crypto.randomUUID(),
      caller_id: callData.callerId,
      receiver_id: callData.receiverId,
      call_type: callData.callType || 'audio',
      call_status: callData.callStatus || 'ended',
      started_at: callData.startedAt || new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_seconds: Number(callData.durationSeconds || 0)
    };

    const { data, error } = await supabase.from('calls').insert([row]).select().single();
    assertNoError(error, 'saveCallLog failed');

    return {
      id: data.id,
      callerId: data.caller_id,
      receiverId: data.receiver_id,
      callType: data.call_type,
      callStatus: data.call_status,
      durationSeconds: data.duration_seconds,
      createdAt: data.started_at
    };
  },

  async getCallHistory(userId) {
    if (!isUuid(userId)) return [];

    const { data, error } = await supabase
      .from('calls')
      .select('*, caller:caller_id(id, username, user_profiles(*)), receiver:receiver_id(id, username, user_profiles(*))')
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('started_at', { ascending: false });

    assertNoError(error, 'getCallHistory failed');

    return (data || []).map((c) => {
      const isCaller = c.caller_id === userId;
      const caller = Array.isArray(c.caller) ? c.caller[0] : c.caller;
      const receiver = Array.isArray(c.receiver) ? c.receiver[0] : c.receiver;
      const partner = isCaller ? receiver : caller;
      const partnerProf = normalizeProfileJoin(partner?.user_profiles);

      return {
        id: c.id,
        callerId: c.caller_id,
        receiverId: c.receiver_id,
        partnerId: partner?.id || (isCaller ? c.receiver_id : c.caller_id),
        partnerName: partnerProf?.display_name || partner?.username || 'GOSH Connection',
        partnerAvatar: partnerProf?.avatar_url || null,
        callType: c.call_type,
        direction: isCaller ? 'outgoing' : 'incoming',
        status: c.call_status,
        durationSeconds: c.duration_seconds || 0,
        createdAt: c.started_at
      };
    });
  },

  // =========================================================================
  // CONTACTS
  // =========================================================================
  async getContacts(userId) {
    if (!isUuid(userId)) return [];

    const { data, error } = await supabase
      .from('contacts')
      .select('*, contact_user:contact_user_id(id, username, user_profiles(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    assertNoError(error, 'getContacts failed');

    return (data || []).map((c) => {
      const cu = Array.isArray(c.contact_user) ? c.contact_user[0] : c.contact_user;
      const prof = normalizeProfileJoin(cu?.user_profiles);
      return {
        contactId: c.id,
        userId: cu?.id || c.contact_user_id,
        username: cu?.username,
        displayName: prof?.display_name || cu?.username || 'Soul Contact',
        avatarUrl: prof?.avatar_url || null,
        bio: prof?.bio || null,
        onlineStatus: Boolean(prof?.online_status),
        lastSeen: prof?.last_seen || null,
        nickname: c.nickname,
        isFavorite: Boolean(c.is_favorite)
      };
    });
  },

  async isContact(userId, targetUserId) {
    if (!isUuid(userId) || !isUuid(targetUserId)) return false;
    if (userId === targetUserId) return true;

    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('contact_user_id', targetUserId)
      .maybeSingle();

    assertNoError(error, 'isContact failed');
    return Boolean(data);
  },

  async addContact(userId, contactUserId, nickname = null) {
    if (!isUuid(userId) || !isUuid(contactUserId)) {
      throw new Error('Valid userId and contactUserId UUIDs required.');
    }
    if (userId === contactUserId) {
      throw new Error('You cannot add yourself as a contact.');
    }

    const { error } = await supabase
      .from('contacts')
      .upsert(
        [{
          id: crypto.randomUUID(),
          user_id: userId,
          contact_user_id: contactUserId,
          nickname: nickname || null
        }],
        { onConflict: 'user_id,contact_user_id' }
      );

    assertNoError(error, 'addContact failed');
    return true;
  },

  async updateContact(userId, contactUserId, nickname) {
    if (!isUuid(userId) || !isUuid(contactUserId)) {
      throw new Error('Valid userId and contactUserId UUIDs required.');
    }

    const { error } = await supabase
      .from('contacts')
      .update({ nickname: nickname || null })
      .eq('user_id', userId)
      .eq('contact_user_id', contactUserId);

    assertNoError(error, 'updateContact failed');
    return true;
  },

  async removeContact(userId, contactUserId) {
    if (!isUuid(userId) || !isUuid(contactUserId)) {
      throw new Error('Valid userId and contactUserId UUIDs required.');
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('user_id', userId)
      .eq('contact_user_id', contactUserId);

    assertNoError(error, 'removeContact failed');
    return true;
  },

  // =========================================================================
  // BLOCKED USERS
  // =========================================================================
  async getBlockedUsers(userId) {
    if (!isUuid(userId)) return [];

    const { data, error } = await supabase
      .from('blocked_users')
      .select('*, blocked_user:blocked_user_id(id, username, user_profiles(display_name, avatar_url))')
      .eq('user_id', userId);

    assertNoError(error, 'getBlockedUsers failed');
    return data || [];
  },

  async blockUser(userId, blockedUserId) {
    if (!isUuid(userId) || !isUuid(blockedUserId)) {
      throw new Error('Valid UUIDs required to block user.');
    }

    const { error } = await supabase
      .from('blocked_users')
      .upsert(
        [{ id: crypto.randomUUID(), user_id: userId, blocked_user_id: blockedUserId }],
        { onConflict: 'user_id,blocked_user_id' }
      );

    assertNoError(error, 'blockUser failed');
    return true;
  },

  async unblockUser(userId, blockedUserId) {
    if (!isUuid(userId) || !isUuid(blockedUserId)) {
      throw new Error('Valid UUIDs required to unblock user.');
    }

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', userId)
      .eq('blocked_user_id', blockedUserId);

    assertNoError(error, 'unblockUser failed');
    return true;
  },

  async isUserBlocked(userAId, userBId) {
    if (!isUuid(userAId) || !isUuid(userBId)) return false;

    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(user_id.eq.${userAId},blocked_user_id.eq.${userBId}),and(user_id.eq.${userBId},blocked_user_id.eq.${userAId})`)
      .limit(1)
      .maybeSingle();

    assertNoError(error, 'isUserBlocked failed');
    return Boolean(data);
  },

  // =========================================================================
  // END-TO-END ENCRYPTION (E2EE PUBLIC KEYS)
  // =========================================================================
  async savePublicKey(userId, publicKey) {
    if (!isUuid(userId)) throw new Error('Valid userId UUID required for public key.');

    let parsedKey = publicKey;
    if (typeof publicKey === 'string') {
      try {
        parsedKey = JSON.parse(publicKey);
      } catch {
        parsedKey = { raw: publicKey };
      }
    }

    const { error } = await supabase.from('encryption_keys').upsert(
      [{
        id: crypto.randomUUID(),
        user_id: userId,
        public_key: parsedKey,
        updated_at: new Date().toISOString()
      }],
      { onConflict: 'user_id' }
    );

    assertNoError(error, 'savePublicKey failed');
    return true;
  },

  async getPublicKey(userId) {
    if (!isUuid(userId)) return null;

    const { data, error } = await supabase
      .from('encryption_keys')
      .select('public_key')
      .eq('user_id', userId)
      .maybeSingle();

    assertNoError(error, 'getPublicKey failed');
    return data?.public_key || null;
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

    if (!isUuid(userId)) return defaultSettings;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    assertNoError(error, 'getUserSettings failed');
    if (!data) return defaultSettings;

    return {
      ...defaultSettings,
      theme: data.theme || defaultSettings.theme,
      soundEnabled: data.sound_enabled ?? defaultSettings.soundEnabled,
      notificationsEnabled: data.notifications_enabled ?? defaultSettings.notificationsEnabled,
      lastSeenPrivacy: data.last_seen_privacy || defaultSettings.lastSeenPrivacy,
      profilePhotoPrivacy: data.profile_photo_visibility || defaultSettings.profilePhotoPrivacy,
      statusPrivacy: data.status_privacy || defaultSettings.statusPrivacy,
      readReceipts: data.read_receipts_enabled ?? defaultSettings.readReceipts,
      hasPasscode: Boolean(data.passcode_hash)
    };
  },

  async updateUserSettings(userId, newSettings) {
    if (!isUuid(userId)) throw new Error('Valid userId UUID required for settings.');

    let passcodeHash = null;
    if (newSettings.passcode) {
      passcodeHash = crypto.createHash('sha256').update(newSettings.passcode).digest('hex');
    }

    const row = {
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    if (newSettings.theme !== undefined) row.theme = newSettings.theme;
    if (newSettings.soundEnabled !== undefined) row.sound_enabled = Boolean(newSettings.soundEnabled);
    if (newSettings.notificationsEnabled !== undefined) {
      row.notifications_enabled = Boolean(newSettings.notificationsEnabled);
    }
    if (newSettings.lastSeenPrivacy !== undefined) row.last_seen_privacy = newSettings.lastSeenPrivacy;
    if (newSettings.profilePhotoPrivacy !== undefined) {
      row.profile_photo_visibility = newSettings.profilePhotoPrivacy;
    }
    if (newSettings.statusPrivacy !== undefined) row.status_privacy = newSettings.statusPrivacy;
    if (newSettings.readReceipts !== undefined) row.read_receipts_enabled = Boolean(newSettings.readReceipts);
    if (passcodeHash) {
      row.passcode_hash = passcodeHash;
      row.passcode_vault_enabled = true;
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert([row], { onConflict: 'user_id' });

    assertNoError(error, 'updateUserSettings failed');
    return this.getUserSettings(userId);
  },

  async verifyUserPasscode(userId, passcode) {
    if (!passcode || !isUuid(userId)) return false;
    const hash = crypto.createHash('sha256').update(passcode).digest('hex');

    const { data, error } = await supabase
      .from('user_settings')
      .select('passcode_hash')
      .eq('user_id', userId)
      .maybeSingle();

    assertNoError(error, 'verifyUserPasscode failed');
    if (!data?.passcode_hash) return false;

    const a = Buffer.from(data.passcode_hash, 'utf8');
    const b = Buffer.from(hash, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  // =========================================================================
  // ONLINE PRESENCE & LAST SEEN
  // =========================================================================
  async updateOnlinePresence(userId, isOnline, lastSeen = null) {
    if (!isUuid(userId)) return false;

    const validIsoTimestamp =
      lastSeen && !Number.isNaN(Date.parse(lastSeen)) ? new Date(lastSeen).toISOString() : new Date().toISOString();

    const { error } = await supabase
      .from('user_profiles')
      .update({
        online_status: Boolean(isOnline),
        last_seen: validIsoTimestamp,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    assertNoError(error, 'updateOnlinePresence failed');
    return true;
  }
};

export default db;
