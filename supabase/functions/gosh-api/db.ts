import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const STORAGE_BUCKET = 'gosh-media';
const STORAGE_PREFIX = `storage://${STORAGE_BUCKET}/`;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function normalizeProfileJoin(profileField: unknown): Record<string, unknown> | null {
  if (!profileField) return null;
  if (Array.isArray(profileField)) {
    return (profileField[0] as Record<string, unknown>) || null;
  }
  return profileField as Record<string, unknown>;
}

function assertNoError(error: { message: string; code?: string; details?: string } | null, context: string) {
  if (error) {
    const err = new Error(`${context}: ${error.message}`) as Error & { code?: string; details?: string };
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
}

function escapeIlike(str: string): string {
  return str.replace(/[\\%_]/g, '\\$&');
}

function sanitizeUsernameBase(raw?: string | null): string {
  const cleaned = (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (cleaned.length >= 3) return cleaned.slice(0, 40);
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `soul_${hex}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function runtime.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function resolveMediaUrl(
  supabase: SupabaseClient,
  rawUrl: string | null | undefined
): Promise<string | null> {
  if (!rawUrl) return null;
  if (!rawUrl.startsWith(STORAGE_PREFIX)) return rawUrl;

  const objectPath = rawUrl.slice(STORAGE_PREFIX.length);
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(objectPath, 3600);

  if (error || !data?.signedUrl) {
    console.warn('Could not sign storage URL:', error?.message);
    return null;
  }
  return data.signedUrl;
}

export async function uploadToStorage(
  supabase: SupabaseClient,
  folder: string,
  ownerId: string,
  file: File
): Promise<{ storageUri: string; signedUrl: string | null; fileName: string; fileSize: number; mimeType: string }> {
  const safeName = (file.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = `${folder}/${ownerId}/${crypto.randomUUID()}_${safeName}`;
  const buffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false
    });

  assertNoError(error, 'uploadToStorage failed');

  const storageUri = `${STORAGE_PREFIX}${objectPath}`;
  const signedUrl = await resolveMediaUrl(supabase, storageUri);

  return {
    storageUri,
    signedUrl,
    fileName: file.name || safeName,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream'
  };
}

export async function broadcastToUsers(
  targetUserIds: string[],
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const validIds = targetUserIds.filter(isUuid);
  if (validIds.length === 0) return;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) return;

  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: validIds.map((uid) => ({
          topic: `gosh:user:${uid}`,
          event,
          payload,
          private: false
        }))
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`Realtime broadcast warning (${res.status}):`, errText);
    }
  } catch (err) {
    console.warn(`Realtime broadcast error (${event}):`, (err as Error).message);
  }
}

export const db = {
  async findUserById(supabase: SupabaseClient, userId: string) {
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

  async findUserByFirebaseUid(supabase: SupabaseClient, firebaseUid: string) {
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

  async findUserByEmail(supabase: SupabaseClient, email: string) {
    if (!email) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*, user_profiles(*)')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    assertNoError(error, 'findUserByEmail failed');
    if (!data) return null;
    return { ...data, user_profiles: normalizeProfileJoin(data.user_profiles) };
  },

  async findUserByIdentifier(supabase: SupabaseClient, identifier: string) {
    if (!identifier) return null;
    const rawTrimmed = identifier.trim();
    const normalized = rawTrimmed.toLowerCase().replace(/^@/, '');
    if (!normalized) return null;

    if (isUuid(rawTrimmed)) {
      return this.findUserById(supabase, rawTrimmed);
    }

    const { data: idRow, error: idErr } = await supabase
      .from('user_identifiers')
      .select('user_id')
      .eq('identifier_value', normalized)
      .maybeSingle();
    assertNoError(idErr, 'findUserByIdentifier(user_identifiers) failed');
    if (idRow?.user_id) {
      const found = await this.findUserById(supabase, idRow.user_id);
      if (found) return found;
    }

    if (normalized.includes('@')) {
      return this.findUserByEmail(supabase, normalized);
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

  async checkAvailability(
    supabase: SupabaseClient,
    { email, username, mobile }: { email?: string | null; username?: string | null; mobile?: string | null }
  ) {
    if (email) {
      const existingEmail = await this.findUserByEmail(supabase, email);
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
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', cleanUser)
        .maybeSingle();
      assertNoError(error, 'checkAvailability(username) failed');
      if (data) {
        return { available: false, field: 'username', message: 'Username is already taken.' };
      }
    }

    if (mobile) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('mobile_number', mobile.trim())
        .maybeSingle();
      assertNoError(error, 'checkAvailability(mobile) failed');
      if (data) {
        return { available: false, field: 'mobile', message: 'Mobile number is already registered.' };
      }
    }

    return { available: true };
  },

  async syncUserIdentifiers(supabase: SupabaseClient, user: Record<string, unknown>) {
    if (!user?.id) return;

    const pairs: Array<{
      user_id: string;
      identifier_type: string;
      identifier_value: string;
      is_verified: boolean;
    }> = [];

    if (typeof user.email === 'string' && user.email) {
      pairs.push({
        user_id: user.id as string,
        identifier_type: 'email',
        identifier_value: user.email.toLowerCase().trim(),
        is_verified: Boolean(user.email_verified)
      });
    }
    if (typeof user.username === 'string' && user.username) {
      pairs.push({
        user_id: user.id as string,
        identifier_type: 'username',
        identifier_value: user.username.toLowerCase().trim(),
        is_verified: true
      });
    }
    if (typeof user.mobile_number === 'string' && user.mobile_number) {
      pairs.push({
        user_id: user.id as string,
        identifier_type: 'mobile',
        identifier_value: user.mobile_number.trim(),
        is_verified: false
      });
    }

    for (const entry of pairs) {
      await supabase
        .from('user_identifiers')
        .delete()
        .eq('user_id', entry.user_id)
        .eq('identifier_type', entry.identifier_type)
        .neq('identifier_value', entry.identifier_value);

      const { error } = await supabase
        .from('user_identifiers')
        .upsert([entry], { onConflict: 'identifier_type,identifier_value' });
      assertNoError(error, `syncUserIdentifiers(${entry.identifier_type}) failed`);
    }
  },

  async ensureUniqueUsername(supabase: SupabaseClient, desiredUsername: string | null | undefined, email: string) {
    const base = sanitizeUsernameBase(desiredUsername || email.split('@')[0]);
    let candidate = base;

    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', candidate)
        .maybeSingle();
      assertNoError(error, 'ensureUniqueUsername failed');
      if (!data) return candidate;

      if (attempt === 0 && desiredUsername && desiredUsername.trim().toLowerCase() === base) {
        const err = new Error('Username is already taken.') as Error & { code?: string };
        err.code = 'USERNAME_TAKEN';
        throw err;
      }

      const bytes = crypto.getRandomValues(new Uint8Array(2));
      const suffix = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      candidate = `${base.slice(0, 40)}_${suffix}`;
    }

    return `${base.slice(0, 32)}_${Date.now().toString().slice(-6)}`;
  },

  async syncFirebaseUser(
    supabase: SupabaseClient,
    params: {
      firebaseUid: string;
      email: string;
      emailVerified?: boolean;
      displayName?: string | null;
      username?: string | null;
      mobileNumber?: string | null;
      photoURL?: string | null;
    }
  ) {
    const cleanEmail = params.email.toLowerCase().trim();
    const cleanMobile = params.mobileNumber ? params.mobileNumber.trim() : null;

    let userRow = await this.findUserByFirebaseUid(supabase, params.firebaseUid);
    if (!userRow) {
      userRow = await this.findUserByEmail(supabase, cleanEmail);
      if (userRow) {
        if (userRow.firebase_uid && userRow.firebase_uid !== params.firebaseUid) {
          const err = new Error('This email is already linked to a different Firebase identity.') as Error & { code?: string };
          err.code = 'FIREBASE_UID_MISMATCH';
          throw err;
        }
        const { data: updatedUser, error: linkErr } = await supabase
          .from('users')
          .update({
            firebase_uid: params.firebaseUid,
            email_verified: Boolean(params.emailVerified || userRow.email_verified),
            updated_at: new Date().toISOString()
          })
          .eq('id', userRow.id)
          .select()
          .single();
        assertNoError(linkErr, 'syncFirebaseUser(link) failed');
        userRow = { ...updatedUser, user_profiles: userRow.user_profiles };
      }
    }

    if (!userRow) {
      const uniqueUsername = await this.ensureUniqueUsername(supabase, params.username, cleanEmail);
      const { data: insertedUser, error: insertErr } = await supabase
        .from('users')
        .insert([{
          id: crypto.randomUUID(),
          firebase_uid: params.firebaseUid,
          email: cleanEmail,
          email_verified: Boolean(params.emailVerified),
          username: uniqueUsername,
          mobile_number: cleanMobile,
          status: 'active'
        }])
        .select()
        .single();
      if (insertErr?.code === '23505') {
        userRow = (await this.findUserByFirebaseUid(supabase, params.firebaseUid))
          || (await this.findUserByEmail(supabase, cleanEmail));
        if (!userRow) assertNoError(insertErr, 'syncFirebaseUser(insert user race) failed');
      } else {
        assertNoError(insertErr, 'syncFirebaseUser(insert user) failed');
        userRow = insertedUser;
      }
    } else if (params.emailVerified && !userRow.email_verified) {
      const { data: verifiedUser, error: verErr } = await supabase
        .from('users')
        .update({ email_verified: true, updated_at: new Date().toISOString() })
        .eq('id', userRow.id)
        .select()
        .single();
      assertNoError(verErr, 'syncFirebaseUser(verify email) failed');
      userRow = { ...verifiedUser, user_profiles: userRow.user_profiles };
    }

    let profileRow = normalizeProfileJoin(userRow.user_profiles);
    if (!profileRow) {
      const { data: existingProfile, error: profErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userRow.id)
        .maybeSingle();
      assertNoError(profErr, 'syncFirebaseUser(fetch profile) failed');
      profileRow = existingProfile;
    }

    if (!profileRow) {
      const defaultAvatar =
        params.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${params.firebaseUid}`;
      const resolvedDisplayName =
        params.displayName?.trim() || (userRow.username as string) || cleanEmail.split('@')[0];

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
      if (profInsertErr?.code === '23505') {
        const { data: raceProfile, error: raceErr } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userRow.id)
          .maybeSingle();
        assertNoError(raceErr, 'syncFirebaseUser(fetch race profile) failed');
        profileRow = raceProfile;
      } else {
        assertNoError(profInsertErr, 'syncFirebaseUser(insert profile) failed');
        profileRow = insertedProfile;
      }
    }

    const { error: setErr } = await supabase
      .from('user_settings')
      .upsert([{ user_id: userRow.id }], { onConflict: 'user_id', ignoreDuplicates: true });
    assertNoError(setErr, 'syncFirebaseUser(upsert settings) failed');

    await this.syncUserIdentifiers(supabase, userRow);

    return {
      user: { ...userRow, user_profiles: profileRow },
      profile: profileRow
    };
  },

  async updateUserProfile(supabase: SupabaseClient, userId: string, updateData: Record<string, unknown>) {
    if (!isUuid(userId)) throw new Error('Invalid user UUID.');

    const userUpdates: Record<string, unknown> = {};
    if (typeof updateData.username === 'string' && updateData.username.trim()) {
      userUpdates.username = updateData.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    }
    if (updateData.mobile !== undefined) {
      userUpdates.mobile_number = updateData.mobile ? String(updateData.mobile).trim() : null;
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
      await this.syncUserIdentifiers(supabase, updatedUser);
    }

    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (updateData.displayName !== undefined) profileUpdates.display_name = updateData.displayName;
    if (updateData.avatarUrl !== undefined) profileUpdates.avatar_url = updateData.avatarUrl;
    if (updateData.bio !== undefined) profileUpdates.bio = updateData.bio;
    if (updateData.relationshipStatus !== undefined) {
      profileUpdates.relationship_status = updateData.relationshipStatus;
    }
    if (updateData.anniversaryDate !== undefined) {
      profileUpdates.anniversary_date = updateData.anniversaryDate || null;
    }

    const { error: pErr } = await supabase
      .from('user_profiles')
      .update(profileUpdates)
      .eq('user_id', userId);
    assertNoError(pErr, 'updateUserProfile(user_profiles) failed');
    return true;
  },

  async searchUsers(supabase: SupabaseClient, query: string, excludeUserId: string) {
    const raw = (query || '').trim().replace(/^@/, '');
    if (!raw) return [];

    if (isUuid(raw)) {
      const found = await this.findUserById(supabase, raw);
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

    const { data: byUsername, error: err1 } = await supabase
      .from('users')
      .select('id, username, user_profiles(display_name, avatar_url, bio, online_status)')
      .ilike('username', pattern)
      .limit(20);
    assertNoError(err1, 'searchUsers(username) failed');

    const { data: byDisplayName, error: err2 } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar_url, bio, online_status, users!user_profiles_user_id_fkey(id, username)')
      .ilike('display_name', pattern)
      .limit(20);
    assertNoError(err2, 'searchUsers(display_name) failed');

    const map = new Map<string, Record<string, unknown>>();
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

  // OTP
  async saveOtp(supabase: SupabaseClient, email: string, rawOtp: string, purpose: string, expiresAt: string) {
    const saltBytes = crypto.getRandomValues(new Uint8Array(8));
    const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const hash = await sha256Hex(`${salt}:${rawOtp}`);
    const otpHash = `${salt}:${hash}`;

    const { error } = await supabase.from('otp_verifications').insert([{
      id: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      otp_hash: otpHash,
      purpose,
      expires_at: expiresAt,
      is_used: false
    }]);
    assertNoError(error, 'saveOtp failed');
  },

  async verifyOtp(supabase: SupabaseClient, email: string, inputOtp: string, purpose: string) {
    const { data: record, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('purpose', purpose)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    assertNoError(error, 'verifyOtp(lookup) failed');

    if (!record) {
      return { success: false, message: 'No active OTP found. Please request a new code.' };
    }
    if (new Date(record.expires_at) < new Date()) {
      return { success: false, message: 'This OTP has expired. Please request a new one.' };
    }

    const [salt, expectedHash] = String(record.otp_hash).split(':');
    const actualHash = await sha256Hex(`${salt}:${inputOtp.trim()}`);
    if (!expectedHash || actualHash !== expectedHash) {
      return { success: false, message: 'Incorrect OTP. Please check and try again.' };
    }

    await supabase.from('otp_verifications').update({ is_used: true }).eq('id', record.id);
    return { success: true };
  },

  // Conversations & Messages
  async findDirectConversationBetween(supabase: SupabaseClient, userAId: string, userBId: string) {
    if (!isUuid(userAId) || !isUuid(userBId)) return null;

    const { data: myMemberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, conversations!inner(id, type)')
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

    return this.getConversationById(supabase, partnerMatch.conversation_id, userAId);
  },

  async getConversationsForUser(supabase: SupabaseClient, userId: string) {
    if (!isUuid(userId)) return [];

    const { data: memberships, error } = await supabase
      .from('conversation_members')
      .select('conversation_id, unread_count, conversations(*)')
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
    const membersByConv = new Map<string, Array<Record<string, unknown>>>();
    for (const row of allMembers || []) {
      if (!membersByConv.has(row.conversation_id)) membersByConv.set(row.conversation_id, []);
      membersByConv.get(row.conversation_id)!.push(row);
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

      const partnerId = (partnerUser?.id || partnerEntry?.user_id || null) as string | null;
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

    result.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
    return result;
  },

  async getConversationById(supabase: SupabaseClient, conversationId: string, viewerUserId: string | null = null) {
    if (!isUuid(conversationId)) return null;
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_members(*)')
      .eq('id', conversationId)
      .maybeSingle();
    assertNoError(error, 'getConversationById failed');
    if (!data) return null;

    const members = (data.conversation_members || []).map((m: { user_id: string }) => m.user_id);
    const partnerId = data.type === 'direct'
      ? (viewerUserId ? members.find((id: string) => id !== viewerUserId) : members[0]) || null
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

  async isConversationMember(supabase: SupabaseClient, userId: string, conversationId: string) {
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

  async createConversation(
    supabase: SupabaseClient,
    convData: {
      type?: string;
      name?: string;
      title?: string;
      avatarUrl?: string;
      description?: string;
      creatorId?: string;
      partnerId?: string;
      members?: string[];
      lastMessageText?: string;
    }
  ) {
    const type = convData.type || 'direct';
    if (type === 'direct' && isUuid(convData.creatorId) && isUuid(convData.partnerId)) {
      const existing = await this.findDirectConversationBetween(supabase, convData.creatorId, convData.partnerId);
      if (existing) return existing;
    }

    const convId = crypto.randomUUID();
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

  async saveMessage(supabase: SupabaseClient, msg: Record<string, unknown>) {
    if (!isUuid(msg.conversationId)) throw new Error('Valid conversation UUID required.');
    if (!isUuid(msg.senderId)) throw new Error('Valid sender UUID required.');

    const msgId = isUuid(msg.id) ? msg.id : crypto.randomUUID();
    const createdAt = (msg.createdAt as string) || new Date().toISOString();

    const row = {
      id: msgId,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      reply_to_id: isUuid(msg.replyToId) ? msg.replyToId : null,
      message_type: (msg.messageType as string) || 'text',
      content: (msg.content as string) || null,
      media_url: (msg.mediaUrl as string) || null,
      audio_url: (msg.audioUrl as string) || null,
      file_name: (msg.fileName as string) || null,
      file_size: msg.fileSize ? Number(msg.fileSize) : null,
      mega_file_handle: (msg.megaFileHandle as string) || null,
      mega_download_url: (msg.megaDownloadUrl as string) || null,
      delivery_status: (msg.deliveryStatus as string) || 'sent',
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
      .update({ last_message_text: snippet, last_message_at: createdAt })
      .eq('id', row.conversation_id);

    const resolvedMediaUrl = await resolveMediaUrl(supabase, inserted.media_url);
    const resolvedAudioUrl = await resolveMediaUrl(supabase, inserted.audio_url);

    return {
      id: inserted.id,
      conversationId: inserted.conversation_id,
      senderId: inserted.sender_id,
      senderName: (msg.senderName as string) || null,
      replyToId: inserted.reply_to_id,
      replyToText: (msg.replyToText as string) || null,
      messageType: inserted.message_type,
      content: inserted.content,
      mediaUrl: resolvedMediaUrl,
      audioUrl: resolvedAudioUrl,
      fileName: inserted.file_name,
      fileSize: inserted.file_size,
      megaFileHandle: inserted.mega_file_handle,
      megaDownloadUrl: inserted.mega_download_url,
      deliveryStatus: inserted.delivery_status,
      isDeletedForAll: inserted.is_deleted_for_all,
      createdAt: inserted.created_at
    };
  },

  async getMessages(supabase: SupabaseClient, conversationId: string) {
    if (!isUuid(conversationId)) return [];
    const { data, error } = await supabase
      .from('messages')
      .select('*, message_reactions(user_id, reaction)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    assertNoError(error, 'getMessages failed');

    return Promise.all(
      (data || []).map(async (m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        replyToId: m.reply_to_id,
        messageType: m.message_type,
        content: m.content,
        mediaUrl: await resolveMediaUrl(supabase, m.media_url),
        audioUrl: await resolveMediaUrl(supabase, m.audio_url),
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
      }))
    );
  },

  async isContact(supabase: SupabaseClient, userId: string, targetUserId: string) {
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

  async isUserBlocked(supabase: SupabaseClient, userAId: string, userBId: string) {
    if (!isUuid(userAId) || !isUuid(userBId)) return false;
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(user_id.eq.${userAId},blocked_user_id.eq.${userBId}),and(user_id.eq.${userBId},blocked_user_id.eq.${userAId})`)
      .limit(1)
      .maybeSingle();
    assertNoError(error, 'isUserBlocked failed');
    return Boolean(data);
  }
};
