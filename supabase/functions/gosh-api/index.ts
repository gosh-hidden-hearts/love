import { verifyFirebaseIdToken } from './firebaseAuth.ts';
import {
  createAdminClient,
  db,
  fetchUsersMapWithProfiles,
  isUuid,
  resolveMediaUrl,
  sha256Hex,
  uploadToStorage,
  broadcastToUsers
} from './db.ts';

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'gosh-81416';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function getRoutePath(urlStr: string): string {
  const url = new URL(urlStr);
  let path = url.pathname;
  // Strip Supabase /functions/v1/gosh-api or /gosh-api prefix
  path = path.replace(/^\/functions\/v1\/gosh-api/, '');
  path = path.replace(/^\/gosh-api/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

async function authenticateRequest(req: Request, supabase: ReturnType<typeof createAdminClient>) {
  const authHeader = req.headers.get('authorization') || '';
  const parts = authHeader.split(' ');
  const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1].trim() : '';
  if (!token) {
    throw Object.assign(new Error('Authentication required: Firebase ID token missing.'), { status: 401 });
  }

  const fbUser = await verifyFirebaseIdToken(token, FIREBASE_PROJECT_ID).catch((err) => {
    throw Object.assign(new Error(`Invalid or expired Firebase ID token: ${err.message}`), { status: 401 });
  });

  const dbUser = await db.findUserByFirebaseUid(supabase, fbUser.uid);
  if (!dbUser) {
    throw Object.assign(new Error('User not synchronized yet. Call /auth/sync-user first.'), { status: 401 });
  }

  return { fbUser, dbUser };
}

async function sendOtpViaResend(email: string, otp: string, purpose: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return false;

  const fromEmail = Deno.env.get('OTP_FROM_EMAIL') || 'GOSH Sanctuary <onboarding@resend.dev>';
  const isSignup = purpose === 'signup';
  const subject = isSignup
    ? 'Your GOSH Verification Code — Welcome to Soul Sanctuary'
    : 'Your GOSH Account Security Code';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject,
      html: `
        <div style="background:#0c0d14;color:#f8fafc;font-family:sans-serif;padding:32px;text-align:center;">
          <div style="max-width:460px;margin:0 auto;background:#151724;border-radius:20px;padding:28px;border:1px solid rgba(244,63,94,0.25);">
            <h2 style="margin:0 0 8px;">❤️ GOSH Verification Code</h2>
            <p style="color:#94a3b8;font-size:13px;">Use this 6-digit security code (valid 10 minutes):</p>
            <div style="margin:20px 0;padding:14px;background:#0c0d14;border-radius:12px;font-size:28px;font-weight:bold;letter-spacing:8px;color:#fff;">
              ${otp}
            </div>
          </div>
        </div>
      `
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Email dispatch failed (${res.status}): ${errText}`);
  }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const route = getRoutePath(req.url);
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  try {
    const supabase = createAdminClient();

    // =========================================================================
    // HEALTH CHECK
    // =========================================================================
    if (method === 'GET' && (route === '/health' || route === '/api/health' || route === '/')) {
      const { error: dbErr } = await supabase.from('users').select('id').limit(1);
      const { data: bucket } = await supabase.storage.getBucket('gosh-media');
      const hasResend = Boolean(Deno.env.get('RESEND_API_KEY'));

      return jsonResponse({
        status: 'online',
        mode: 'supabase-edge',
        app: 'GOSH (Glimpse Of Soul Hearts)',
        timestamp: new Date().toISOString(),
        services: {
          supabase: dbErr ? 'error' : 'connected',
          supabaseServiceRole: 'configured',
          supabaseError: dbErr?.message || null,
          firebaseAuth: 'configured',
          supabaseStorage: bucket ? 'ready' : 'bucket_missing',
          realtime: 'active',
          emailOtp: hasResend ? 'ready' : 'firebase_native'
        }
      });
    }

    // =========================================================================
    // PUBLIC AUTH HELPERS (Pre-login / Pre-signup)
    // =========================================================================
    if (method === 'POST' && route === '/auth/resolve-identifier') {
      const { identifier } = await req.json();
      if (!identifier) return jsonResponse({ success: false, message: 'Identifier is required.' }, 400);
      const user = await db.findUserByIdentifier(supabase, identifier);
      if (!user) return jsonResponse({ success: false, message: 'No registered account found with this identifier.' }, 404);
      return jsonResponse({ success: true, email: user.email });
    }

    if (method === 'POST' && route === '/auth/check-availability') {
      const { username, mobile, email } = await req.json();
      const result = await db.checkAvailability(supabase, { email, username, mobile });
      return jsonResponse(result);
    }

    if (method === 'POST' && route === '/auth/send-otp') {
      const { email, identifier, purpose = 'signup' } = await req.json();
      let targetEmail = email ? String(email).trim().toLowerCase() : null;

      if (!targetEmail && identifier) {
        const user = await db.findUserByIdentifier(supabase, String(identifier));
        if (user) targetEmail = user.email;
        else if (String(identifier).includes('@')) targetEmail = String(identifier).trim().toLowerCase();
      }

      if (!targetEmail) {
        return jsonResponse({ success: false, message: 'Valid email or identifier is required.' }, 400);
      }

      if (purpose === 'signup') {
        const existing = await db.findUserByEmail(supabase, targetEmail);
        if (existing) {
          return jsonResponse({
            success: false,
            code: 'EMAIL_ALREADY_IN_USE',
            message: 'An account with this email address already exists. Please sign in to continue.'
          }, 400);
        }
      }

      if (!Deno.env.get('RESEND_API_KEY')) {
        return jsonResponse({
          success: false,
          code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
          useFirebaseVerification: true,
          email: targetEmail,
          message: 'Direct OTP email provider is not configured; using Firebase native verification.'
        });
      }

      const rawOtp = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await db.saveOtp(supabase, targetEmail, rawOtp, purpose, expiresAt);
      await sendOtpViaResend(targetEmail, rawOtp, purpose);

      return jsonResponse({ success: true, email: targetEmail });
    }

    if (method === 'POST' && route === '/auth/verify-otp') {
      const { email, identifier, otp, purpose = 'signup' } = await req.json();
      let targetEmail = email ? String(email).trim().toLowerCase() : null;
      if (!targetEmail && identifier) {
        const user = await db.findUserByIdentifier(supabase, String(identifier));
        if (user) targetEmail = user.email;
        else if (String(identifier).includes('@')) targetEmail = String(identifier).trim().toLowerCase();
      }
      if (!targetEmail || !otp) {
        return jsonResponse({ success: false, message: 'Email and OTP are required.' }, 400);
      }
      const result = await db.verifyOtp(supabase, targetEmail, String(otp), purpose);
      return jsonResponse(result, result.success ? 200 : 400);
    }

    if (method === 'POST' && route === '/auth/terms-accept') {
      const body = await req.json().catch(() => ({}));
      let userId: string | null = null;
      try {
        const { dbUser } = await authenticateRequest(req, supabase);
        userId = dbUser.id;
      } catch {
        // Pre-login terms acceptance is allowed with null user_id
      }

      await supabase.from('terms_acceptance').insert([{
        id: crypto.randomUUID(),
        user_id: userId,
        terms_version: body.termsVersion || 'v1.0.0',
        privacy_version: body.privacyVersion || 'v1.0.0',
        accepted_at: body.timestamp || new Date().toISOString()
      }]);
      return jsonResponse({ success: true });
    }

    // =========================================================================
    // FIREBASE-TO-SUPABASE SYNC (Strictly verifies Firebase RS256 ID Token)
    // =========================================================================
    if (method === 'POST' && route === '/auth/sync-user') {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        return jsonResponse({ success: false, message: 'Firebase ID token required.' }, 401);
      }

      const verified = await verifyFirebaseIdToken(token, FIREBASE_PROJECT_ID).catch((err) => {
        throw Object.assign(new Error(`Invalid Firebase ID token: ${err.message}`), { status: 401 });
      });

      if (!verified.email) {
        return jsonResponse({ success: false, message: 'Verified Firebase account must have an email.' }, 400);
      }

      const body = await req.json().catch(() => ({}));
      const result = await db.syncFirebaseUser(supabase, {
        firebaseUid: verified.uid,
        email: verified.email,
        emailVerified: verified.emailVerified,
        displayName: body.displayName || verified.name,
        username: body.username || null,
        mobileNumber: body.mobile_number || verified.phoneNumber || null,
        photoURL: body.photoURL || verified.picture || null
      });

      return jsonResponse({
        success: true,
        user: result.user,
        profile: result.profile
      });
    }

    // =========================================================================
    // ALL ROUTES BELOW REQUIRE AUTHENTICATED FIREBASE TOKEN + SYNCED USER
    // =========================================================================
    const { fbUser, dbUser } = await authenticateRequest(req, supabase);
    const currentUserId = dbUser.id as string;
    const resolveSelfId = (idOrAlias: string) =>
      idOrAlias === 'me' || idOrAlias === fbUser.uid ? currentUserId : idOrAlias;

    // Search Users
    if (method === 'GET' && route === '/users/search') {
      const q = url.searchParams.get('q') || '';
      const users = await db.searchUsers(supabase, q, currentUserId);
      return jsonResponse({ success: true, users });
    }

    // Profile Get & Update
    const profileMatch = route.match(/^\/users\/profile\/([^/]+)$/);
    if (profileMatch) {
      const targetId = resolveSelfId(profileMatch[1]);
      if (method === 'GET') {
        const user = await db.findUserById(supabase, targetId);
        if (!user) return jsonResponse({ success: false, message: 'User not found.' }, 404);
        const sanitizedUser = targetId === currentUserId
          ? user
          : { id: user.id, username: user.username, status: user.status, user_profiles: user.user_profiles };
        return jsonResponse({ success: true, user: sanitizedUser, profile: user.user_profiles });
      }
      if (method === 'PUT') {
        if (targetId !== currentUserId) {
          return jsonResponse({ success: false, message: 'Forbidden: Cannot update another user profile.' }, 403);
        }
        const body = await req.json();
        await db.updateUserProfile(supabase, currentUserId, body);
        const updated = await db.findUserById(supabase, currentUserId);
        return jsonResponse({
          success: true,
          message: 'Profile updated successfully.',
          user: updated,
          profile: updated?.user_profiles || null
        });
      }
    }

    // Online Presence update
    if (method === 'POST' && route === '/users/presence') {
      const { online } = await req.json().catch(() => ({ online: true }));
      await supabase
        .from('user_profiles')
        .update({
          online_status: Boolean(online),
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUserId);
      return jsonResponse({ success: true });
    }

    // Contacts
    if (route === '/users/contacts' && method === 'GET') {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userMap = await fetchUsersMapWithProfiles(
        supabase,
        (data || []).map((c) => c.contact_user_id)
      );

      const contacts = (data || []).map((c) => {
        const cu = userMap.get(c.contact_user_id);
        const prof = cu?.user_profiles as Record<string, unknown> | null;
        return {
          contactId: c.id,
          userId: c.contact_user_id,
          username: (cu?.username as string) || 'user',
          displayName: (prof?.display_name as string) || (cu?.username as string) || 'Soul Contact',
          avatarUrl: (prof?.avatar_url as string) || null,
          bio: (prof?.bio as string) || null,
          onlineStatus: Boolean(prof?.online_status),
          lastSeen: (prof?.last_seen as string) || null,
          nickname: c.nickname,
          isFavorite: Boolean(c.is_favorite)
        };
      });
      return jsonResponse({ success: true, contacts });
    }

    if (route === '/users/contacts' && method === 'POST') {
      const { contactUserId, nickname } = await req.json();
      if (!isUuid(contactUserId)) return jsonResponse({ success: false, message: 'Valid contact user ID required.' }, 400);
      if (contactUserId === currentUserId) return jsonResponse({ success: false, message: 'Cannot add yourself.' }, 400);
      const { error } = await supabase.from('contacts').upsert(
        [{ id: crypto.randomUUID(), user_id: currentUserId, contact_user_id: contactUserId, nickname: nickname || null }],
        { onConflict: 'user_id,contact_user_id' }
      );
      if (error) throw error;
      return jsonResponse({ success: true, message: 'Contact saved successfully.' });
    }

    const contactParamMatch = route.match(/^\/users\/contacts\/([^/]+)$/);
    if (contactParamMatch) {
      const targetContactId = contactParamMatch[1];
      if (!isUuid(targetContactId)) return jsonResponse({ success: false, message: 'Invalid contact ID.' }, 400);
      if (method === 'PUT') {
        const { nickname } = await req.json();
        const { error } = await supabase
          .from('contacts')
          .update({ nickname: nickname || null })
          .eq('user_id', currentUserId)
          .eq('contact_user_id', targetContactId);
        if (error) throw error;
        return jsonResponse({ success: true, message: 'Contact nickname updated.' });
      }
      if (method === 'DELETE') {
        const { error } = await supabase
          .from('contacts')
          .delete()
          .eq('user_id', currentUserId)
          .eq('contact_user_id', targetContactId);
        if (error) throw error;
        return jsonResponse({ success: true, message: 'Contact removed.' });
      }
    }

    // Blocked Users
    if (route === '/users/blocked' && method === 'GET') {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('user_id', currentUserId);
      if (error) throw error;

      const userMap = await fetchUsersMapWithProfiles(
        supabase,
        (data || []).map((b) => b.blocked_user_id)
      );
      const blockedList = (data || []).map((b) => {
        const bu = userMap.get(b.blocked_user_id);
        const prof = bu?.user_profiles as Record<string, unknown> | null;
        return {
          ...b,
          blocked_user: bu
            ? {
                id: bu.id,
                username: bu.username,
                user_profiles: {
                  display_name: prof?.display_name || null,
                  avatar_url: prof?.avatar_url || null
                }
              }
            : null
        };
      });
      return jsonResponse({ success: true, blockedUsers: blockedList, blocked: blockedList });
    }

    if (route === '/users/block' && method === 'POST') {
      const { blockedUserId } = await req.json();
      if (!isUuid(blockedUserId)) return jsonResponse({ success: false, message: 'Valid user ID required.' }, 400);
      const { error } = await supabase.from('blocked_users').upsert(
        [{ id: crypto.randomUUID(), user_id: currentUserId, blocked_user_id: blockedUserId }],
        { onConflict: 'user_id,blocked_user_id' }
      );
      if (error) throw error;
      return jsonResponse({ success: true, message: 'User blocked.' });
    }

    if (route === '/users/unblock' && method === 'POST') {
      const { blockedUserId } = await req.json();
      if (!isUuid(blockedUserId)) return jsonResponse({ success: false, message: 'Valid user ID required.' }, 400);
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', currentUserId)
        .eq('blocked_user_id', blockedUserId);
      if (error) throw error;
      return jsonResponse({ success: true, message: 'User unblocked.' });
    }

    // E2EE Public Keys
    if (route === '/users/public-key' && method === 'POST') {
      const { publicKey } = await req.json();
      if (!publicKey) return jsonResponse({ success: false, message: 'Public key required.' }, 400);
      let parsedKey = publicKey;
      if (typeof publicKey === 'string') {
        try {
          parsedKey = JSON.parse(publicKey);
        } catch {
          parsedKey = { raw: publicKey };
        }
      }
      const { error } = await supabase.from('encryption_keys').upsert(
        [{ id: crypto.randomUUID(), user_id: currentUserId, public_key: parsedKey, updated_at: new Date().toISOString() }],
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return jsonResponse({ success: true, message: 'Public key published successfully.' });
    }

    const pubKeyMatch = route.match(/^\/users\/([^/]+)\/public-key$/);
    if (pubKeyMatch && method === 'GET') {
      const targetUid = pubKeyMatch[1];
      if (!isUuid(targetUid)) return jsonResponse({ success: true, publicKey: null });
      const { data, error } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('user_id', targetUid)
        .maybeSingle();
      if (error) throw error;
      return jsonResponse({ success: true, publicKey: data?.public_key || null });
    }

    // Conversations
    if (route === '/conversations' && method === 'GET') {
      const conversations = await db.getConversationsForUser(supabase, currentUserId);
      return jsonResponse({ success: true, conversations });
    }

    if (route === '/conversations' && method === 'POST') {
      const { partnerId, name, avatarUrl } = await req.json();
      if (!isUuid(partnerId)) return jsonResponse({ success: false, message: 'Valid partnerId UUID required.' }, 400);
      if (partnerId === currentUserId) return jsonResponse({ success: false, message: 'Cannot chat with yourself.' }, 400);

      if (await db.isUserBlocked(supabase, currentUserId, partnerId)) {
        return jsonResponse({ success: false, code: 'USER_BLOCKED', message: 'User is blocked.' }, 403);
      }
      if (!(await db.isContact(supabase, currentUserId, partnerId))) {
        return jsonResponse({
          success: false,
          code: 'NOT_A_CONTACT',
          message: 'Contact restriction: You can only message users saved in your contacts.'
        }, 403);
      }

      const conversation = await db.createConversation(supabase, {
        type: 'direct',
        partnerId,
        name,
        avatarUrl,
        creatorId: currentUserId,
        members: [currentUserId, partnerId]
      });
      return jsonResponse({ success: true, conversation });
    }

    if (route === '/conversations/group' && method === 'POST') {
      const { name, description, avatarUrl, members } = await req.json();
      if (!name) return jsonResponse({ success: false, message: 'Group name is required.' }, 400);
      const allMembers = Array.from(new Set([currentUserId, ...(members || [])].filter(isUuid)));
      const group = await db.createConversation(supabase, {
        type: 'group',
        name,
        description: description || 'Romantic Soul Group ✨',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
        creatorId: currentUserId,
        members: allMembers,
        lastMessageText: `Group "${name}" was created`
      });
      return jsonResponse({ success: true, group });
    }

    // Messages
    if (route === '/messages/upload' && method === 'POST') {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return jsonResponse({ success: false, message: 'No attachment file provided.' }, 400);
      }

      let messageType = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';

      const uploaded = await uploadToStorage(supabase, 'chat', currentUserId, file);
      return jsonResponse({
        success: true,
        fileUrl: uploaded.storageUri,
        previewUrl: uploaded.signedUrl,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        messageType
      });
    }

    if (route === '/messages' && method === 'POST') {
      const msg = await req.json();
      msg.senderId = currentUserId;

      if (!msg.conversationId && msg.targetUserId) {
        if (!isUuid(msg.targetUserId)) {
          return jsonResponse({ success: false, message: 'Valid targetUserId required.' }, 400);
        }
        const existingConv = await db.findDirectConversationBetween(supabase, currentUserId, msg.targetUserId);
        if (existingConv) {
          msg.conversationId = existingConv.id;
        } else {
          if (!(await db.isContact(supabase, currentUserId, msg.targetUserId))) {
            return jsonResponse({
              success: false,
              code: 'NOT_A_CONTACT',
              message: 'Messaging restricted: You can only message users saved in your contacts.'
            }, 403);
          }
          const created = await db.createConversation(supabase, {
            type: 'direct',
            creatorId: currentUserId,
            partnerId: msg.targetUserId,
            members: [currentUserId, msg.targetUserId]
          });
          msg.conversationId = created.id;
        }
      }

      if (!isUuid(msg.conversationId)) {
        return jsonResponse({ success: false, message: 'Valid conversationId UUID required.' }, 400);
      }

      const conv = await db.getConversationById(supabase, msg.conversationId, currentUserId);
      if (!conv) return jsonResponse({ success: false, message: 'Conversation not found.' }, 404);
      if (!conv.members.includes(currentUserId)) {
        return jsonResponse({ success: false, message: 'Unauthorized: Not a member of this conversation.' }, 403);
      }

      if (!conv.isGroup) {
        const recipientId = conv.members.find((m: string) => m !== currentUserId);
        if (recipientId) {
          if (await db.isUserBlocked(supabase, currentUserId, recipientId)) {
            return jsonResponse({ success: false, code: 'USER_BLOCKED', message: 'User is blocked.' }, 403);
          }
          if (!(await db.isContact(supabase, currentUserId, recipientId))) {
            return jsonResponse({
              success: false,
              code: 'NOT_A_CONTACT',
              message: 'Messaging restricted: You can only message users saved in your contacts.'
            }, 403);
          }
        }
      }

      const saved = await db.saveMessage(supabase, msg);

      // Push real-time message event to all other participants via Supabase Realtime Broadcast
      const recipients = conv.members.filter((m: string) => m !== currentUserId);
      await broadcastToUsers(
        recipients,
        'receive_message',
        saved as unknown as Record<string, unknown>
      );

      return jsonResponse({ success: true, message: saved });
    }

    const msgReactionMatch = route.match(/^\/messages\/([^/]+)\/reaction$/);
    if (msgReactionMatch && method === 'POST') {
      const messageId = msgReactionMatch[1];
      if (!isUuid(messageId)) return jsonResponse({ success: false, message: 'Invalid messageId.' }, 400);
      const { reaction } = await req.json();
      const { error } = await supabase
        .from('message_reactions')
        .upsert(
          [{ id: crypto.randomUUID(), message_id: messageId, user_id: currentUserId, reaction }],
          { onConflict: 'message_id,user_id' }
        );
      if (error) throw error;
      return jsonResponse({ success: true, messageId, reaction });
    }

    const msgIdMatch = route.match(/^\/messages\/([^/]+)$/);
    if (msgIdMatch) {
      const idParam = msgIdMatch[1];
      if (method === 'GET') {
        if (!(await db.isConversationMember(supabase, currentUserId, idParam))) {
          return jsonResponse({ success: false, message: 'Unauthorized: Not a conversation member.' }, 403);
        }
        const messages = await db.getMessages(supabase, idParam);
        return jsonResponse({ success: true, messages });
      }
      if (method === 'DELETE') {
        if (!isUuid(idParam)) return jsonResponse({ success: false, message: 'Invalid messageId.' }, 400);
        const body = await req.json().catch(() => ({}));
        if (body.deleteForEveryone) {
          const { error } = await supabase
            .from('messages')
            .update({
              content: '🚫 This message was deleted.',
              is_deleted_for_all: true,
              media_url: null,
              audio_url: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', idParam)
            .eq('sender_id', currentUserId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', idParam)
            .eq('sender_id', currentUserId);
          if (error) throw error;
        }
        return jsonResponse({ success: true, messageId: idParam });
      }
    }

    // Statuses
    if (route === '/statuses' && method === 'GET') {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('statuses')
        .select('*, status_views(*)')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userMap = await fetchUsersMapWithProfiles(
        supabase,
        (data || []).map((s) => s.user_id)
      );

      const allStatuses = await Promise.all(
        (data || []).map(async (s) => {
          const usr = userMap.get(s.user_id);
          const prof = usr?.user_profiles as Record<string, unknown> | null;
          return {
            id: s.id,
            userId: s.user_id,
            userName: (prof?.display_name as string) || (usr?.username as string) || 'Partner',
            userAvatar: (prof?.avatar_url as string) || null,
            type: s.status_type || 'text',
            content: s.content,
            gradient: s.background_color,
            mediaUrl: await resolveMediaUrl(supabase, s.media_url),
            caption: s.caption,
            createdAt: s.created_at,
            expiresAt: s.expires_at,
            viewsCount: s.status_views?.length || s.views_count || 0,
            viewers: (s.status_views || []).map((v: { viewer_id: string }) => v.viewer_id)
          };
        })
      );

      return jsonResponse({
        success: true,
        statuses: allStatuses.filter((s) => s.userId !== currentUserId),
        myStatuses: allStatuses.filter((s) => s.userId === currentUserId)
      });
    }

    if (route === '/statuses' && method === 'POST') {
      const formData = await req.formData();
      const statusType = String(formData.get('statusType') || 'text').slice(0, 20);
      const content = formData.get('content') ? String(formData.get('content')) : null;
      const gradient = (formData.get('gradient') ? String(formData.get('gradient')) : '#2e0854').slice(0, 30);
      const caption = formData.get('caption') ? String(formData.get('caption')) : null;
      const mediaFile = formData.get('media');

      let mediaStorageUri: string | null = null;
      if (mediaFile instanceof File) {
        const uploaded = await uploadToStorage(supabase, 'statuses', currentUserId, mediaFile);
        mediaStorageUri = uploaded.storageUri;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data: inserted, error } = await supabase
        .from('statuses')
        .insert([{
          id: crypto.randomUUID(),
          user_id: currentUserId,
          status_type: statusType,
          content,
          media_url: mediaStorageUri,
          caption,
          background_color: gradient,
          views_count: 0,
          expires_at: expiresAt,
          created_at: now.toISOString()
        }])
        .select()
        .single();
      if (error) throw error;

      return jsonResponse({
        success: true,
        status: {
          id: inserted.id,
          userId: inserted.user_id,
          userName: dbUser.user_profiles?.display_name || dbUser.username || 'My Status',
          userAvatar: dbUser.user_profiles?.avatar_url || null,
          type: inserted.status_type,
          content: inserted.content,
          gradient: inserted.background_color,
          mediaUrl: await resolveMediaUrl(supabase, inserted.media_url),
          caption: inserted.caption,
          createdAt: inserted.created_at,
          expiresAt: inserted.expires_at,
          viewsCount: 0,
          viewers: []
        }
      });
    }

    const statusViewMatch = route.match(/^\/statuses\/([^/]+)\/view$/);
    if (statusViewMatch && method === 'POST') {
      const statusId = statusViewMatch[1];
      if (!isUuid(statusId)) return jsonResponse({ success: true, status: null });
      await supabase.from('status_views').upsert(
        [{ id: crypto.randomUUID(), status_id: statusId, viewer_id: currentUserId, viewed_at: new Date().toISOString() }],
        { onConflict: 'status_id,viewer_id' }
      );
      const { count } = await supabase
        .from('status_views')
        .select('id', { count: 'exact', head: true })
        .eq('status_id', statusId);
      if (typeof count === 'number') {
        await supabase.from('statuses').update({ views_count: count }).eq('id', statusId);
      }
      return jsonResponse({ success: true, status: { id: statusId, viewsCount: count || 0 } });
    }

    const statusIdMatch = route.match(/^\/statuses\/([^/]+)$/);
    if (statusIdMatch && method === 'DELETE') {
      const statusId = statusIdMatch[1];
      if (isUuid(statusId)) {
        const { error } = await supabase.from('statuses').delete().eq('id', statusId).eq('user_id', currentUserId);
        if (error) throw error;
      }
      return jsonResponse({ success: true, message: 'Status deleted successfully' });
    }

    // Calls
    if (route === '/calls/history' && method === 'GET') {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('started_at', { ascending: false });
      if (error) throw error;

      const userMap = await fetchUsersMapWithProfiles(
        supabase,
        (data || []).flatMap((c) => [c.caller_id, c.receiver_id])
      );

      const calls = (data || []).map((c) => {
        const isCaller = c.caller_id === currentUserId;
        const partnerId = isCaller ? c.receiver_id : c.caller_id;
        const partner = userMap.get(partnerId);
        const prof = partner?.user_profiles as Record<string, unknown> | null;

        return {
          id: c.id,
          callerId: c.caller_id,
          receiverId: c.receiver_id,
          partnerId,
          partnerName: (prof?.display_name as string) || (partner?.username as string) || 'GOSH Connection',
          partnerAvatar: (prof?.avatar_url as string) || null,
          callType: c.call_type,
          direction: isCaller ? 'outgoing' : 'incoming',
          status: c.call_status,
          durationSeconds: c.duration_seconds || 0,
          createdAt: c.started_at
        };
      });
      return jsonResponse({ success: true, calls });
    }

    if (route === '/calls/log' && method === 'POST') {
      const { callerId, receiverId, callType, callStatus, durationSeconds } = await req.json();
      if (!isUuid(callerId) || !isUuid(receiverId)) {
        return jsonResponse({ success: false, message: 'Valid callerId and receiverId UUIDs required.' }, 400);
      }
      if (callerId !== currentUserId && receiverId !== currentUserId) {
        return jsonResponse({ success: false, message: 'Forbidden' }, 403);
      }
      const { data, error } = await supabase
        .from('calls')
        .insert([{
          id: crypto.randomUUID(),
          caller_id: callerId,
          receiver_id: receiverId,
          call_type: callType || 'audio',
          call_status: callStatus || 'ended',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: Number(durationSeconds || 0)
        }])
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, call: data });
    }

    // Memory Vault (Supabase Storage + PostgreSQL)
    if (route === '/memory-vault' && method === 'GET') {
      const { data: memberships, error: memErr } = await supabase
        .from('memory_members')
        .select('space_id')
        .eq('user_id', currentUserId);
      if (memErr) throw memErr;

      const spaceIds = (memberships || []).map((m) => m.space_id);
      if (spaceIds.length === 0) return jsonResponse({ success: true, memories: [] });

      const { data, error } = await supabase
        .from('memory_files')
        .select('*, memory_albums(name)')
        .in('space_id', spaceIds)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userMap = await fetchUsersMapWithProfiles(
        supabase,
        (data || []).map((m) => m.uploader_id)
      );

      const memories = await Promise.all(
        (data || []).map(async (m) => {
          const album = Array.isArray(m.memory_albums) ? m.memory_albums[0] : m.memory_albums;
          const uploader = userMap.get(m.uploader_id);
          const prof = uploader?.user_profiles as Record<string, unknown> | null;
          return {
            id: m.id,
            spaceId: m.space_id,
            fileName: m.file_name,
            fileType: m.file_type,
            fileSize: m.file_size,
            mimeType: m.mime_type,
            megaFileHandle: m.mega_file_handle,
            megaDownloadUrl: await resolveMediaUrl(supabase, m.mega_download_url),
            caption: m.caption,
            memoryDate: m.memory_date,
            feelingsTag: m.feelings_tag,
            album: album?.name || 'All Memories',
            uploaderId: m.uploader_id,
            uploaderName: (prof?.display_name as string) || (uploader?.username as string) || 'Soul Partner',
            createdAt: m.created_at
          };
        })
      );
      return jsonResponse({ success: true, memories });
    }

    if (route === '/memory-vault/upload' && method === 'POST') {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return jsonResponse({ success: false, message: 'No file provided for upload.' }, 400);
      }

      const caption = formData.get('caption') ? String(formData.get('caption')) : null;
      const memoryDate = formData.get('memoryDate')
        ? String(formData.get('memoryDate'))
        : new Date().toISOString().split('T')[0];
      const feelingsTag = formData.get('feelingsTag') ? String(formData.get('feelingsTag')) : null;
      const albumName = formData.get('album') ? String(formData.get('album')) : 'All Memories';
      const fileType = formData.get('fileType') ? String(formData.get('fileType')) : 'document';

      // Get or create default space
      let spaceId: string | null = null;
      const { data: membership } = await supabase
        .from('memory_members')
        .select('space_id')
        .eq('user_id', currentUserId)
        .limit(1)
        .maybeSingle();

      if (membership?.space_id) {
        spaceId = membership.space_id;
      } else {
        spaceId = crypto.randomUUID();
        const { error: spaceErr } = await supabase
          .from('memory_spaces')
          .insert([{ id: spaceId, name: 'Our Romantic Vault', created_by: currentUserId }]);
        if (spaceErr) throw spaceErr;
        const { error: addMemErr } = await supabase
          .from('memory_members')
          .insert([{ id: crypto.randomUUID(), space_id: spaceId, user_id: currentUserId, access_level: 'admin' }]);
        if (addMemErr) throw addMemErr;
      }

      let albumId: string | null = null;
      if (albumName && albumName !== 'All Memories') {
        const { data: existingAlbum } = await supabase
          .from('memory_albums')
          .select('id')
          .eq('space_id', spaceId)
          .eq('name', albumName)
          .maybeSingle();
        if (existingAlbum) {
          albumId = existingAlbum.id;
        } else {
          const { data: createdAlbum, error: albErr } = await supabase
            .from('memory_albums')
            .insert([{ id: crypto.randomUUID(), space_id: spaceId, name: albumName }])
            .select('id')
            .single();
          if (albErr) throw albErr;
          albumId = createdAlbum.id;
        }
      }

      const uploaded = await uploadToStorage(supabase, 'vault', spaceId, file);
      const { data: inserted, error } = await supabase
        .from('memory_files')
        .insert([{
          id: crypto.randomUUID(),
          space_id: spaceId,
          album_id: albumId,
          uploader_id: currentUserId,
          file_name: uploaded.fileName,
          file_type: fileType,
          file_size: uploaded.fileSize,
          mime_type: uploaded.mimeType,
          mega_file_handle: uploaded.storageUri,
          mega_download_url: uploaded.storageUri,
          caption,
          memory_date: memoryDate,
          feelings_tag: feelingsTag
        }])
        .select()
        .single();
      if (error) throw error;

      return jsonResponse({
        success: true,
        memory: {
          id: inserted.id,
          spaceId: inserted.space_id,
          fileName: inserted.file_name,
          fileType: inserted.file_type,
          fileSize: inserted.file_size,
          mimeType: inserted.mime_type,
          megaDownloadUrl: uploaded.signedUrl,
          caption: inserted.caption,
          memoryDate: inserted.memory_date,
          feelingsTag: inserted.feelings_tag,
          album: albumName,
          uploaderId: inserted.uploader_id,
          uploaderName: dbUser.user_profiles?.display_name || dbUser.username || 'You',
          createdAt: inserted.created_at
        }
      });
    }

    const memoryIdMatch = route.match(/^\/memory-vault\/([^/]+)$/);
    if (memoryIdMatch && method === 'DELETE') {
      const memoryId = memoryIdMatch[1];
      if (!isUuid(memoryId)) return jsonResponse({ success: true });
      const { data: mem } = await supabase
        .from('memory_files')
        .select('id, uploader_id, mega_file_handle')
        .eq('id', memoryId)
        .maybeSingle();

      if (mem && mem.uploader_id !== currentUserId) {
        return jsonResponse({ success: false, message: 'Forbidden: Only the uploader can delete.' }, 403);
      }
      if (mem?.mega_file_handle?.startsWith('storage://gosh-media/')) {
        const path = mem.mega_file_handle.replace('storage://gosh-media/', '');
        await supabase.storage.from('gosh-media').remove([path]);
      }
      const { error } = await supabase.from('memory_files').delete().eq('id', memoryId).eq('uploader_id', currentUserId);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // Settings & Passcode Vault
    const verifyPassMatch = route.match(/^\/settings\/([^/]+)\/verify-passcode$/);
    if (verifyPassMatch && method === 'POST') {
      const targetUid = resolveSelfId(verifyPassMatch[1]);
      if (targetUid !== currentUserId) return jsonResponse({ success: false, message: 'Forbidden' }, 403);
      const { passcode } = await req.json();
      if (!passcode) return jsonResponse({ success: false, valid: false });
      const hash = await sha256Hex(String(passcode));
      const { data } = await supabase
        .from('user_settings')
        .select('passcode_hash')
        .eq('user_id', currentUserId)
        .maybeSingle();
      const valid = Boolean(data?.passcode_hash && data.passcode_hash === hash);
      return jsonResponse({ success: valid, valid });
    }

    const settingsMatch = route.match(/^\/settings\/([^/]+)$/);
    if (settingsMatch) {
      const targetUid = resolveSelfId(settingsMatch[1]);
      if (targetUid !== currentUserId) return jsonResponse({ success: false, message: 'Forbidden' }, 403);

      if (method === 'GET') {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({
          success: true,
          settings: {
            userId: currentUserId,
            theme: data?.theme || 'romantic-dark',
            soundEnabled: data?.sound_enabled ?? true,
            notificationsEnabled: data?.notifications_enabled ?? true,
            callRingtoneEnabled: true,
            lastSeenPrivacy: data?.last_seen_privacy || 'everyone',
            profilePhotoPrivacy: data?.profile_photo_visibility || 'everyone',
            aboutPrivacy: 'everyone',
            statusPrivacy: data?.status_privacy || 'contacts',
            readReceipts: data?.read_receipts_enabled ?? true,
            hasPasscode: Boolean(data?.passcode_hash)
          }
        });
      }

      if (method === 'PUT') {
        const body = await req.json();
        const row: Record<string, unknown> = {
          user_id: currentUserId,
          updated_at: new Date().toISOString()
        };
        if (body.theme !== undefined) row.theme = body.theme;
        if (body.soundEnabled !== undefined) row.sound_enabled = Boolean(body.soundEnabled);
        if (body.notificationsEnabled !== undefined) row.notifications_enabled = Boolean(body.notificationsEnabled);
        if (body.lastSeenPrivacy !== undefined) row.last_seen_privacy = body.lastSeenPrivacy;
        if (body.profilePhotoPrivacy !== undefined) row.profile_photo_visibility = body.profilePhotoPrivacy;
        if (body.statusPrivacy !== undefined) row.status_privacy = body.statusPrivacy;
        if (body.readReceipts !== undefined) row.read_receipts_enabled = Boolean(body.readReceipts);
        if (body.passcode) {
          row.passcode_hash = await sha256Hex(String(body.passcode));
          row.passcode_vault_enabled = true;
        }
        const { error } = await supabase.from('user_settings').upsert([row], { onConflict: 'user_id' });
        if (error) throw error;
        return jsonResponse({ success: true, message: 'Settings saved.' });
      }
    }

    return jsonResponse({ success: false, message: `Route not found: ${method} ${route}` }, 404);
  } catch (err) {
    const status = (err as { status?: number })?.status || 500;
    console.error('Edge Function Error:', err);
    return jsonResponse(
      {
        success: false,
        code: (err as { code?: string })?.code || 'EDGE_ERROR',
        message: (err as Error).message || 'Internal Edge Function Error'
      },
      status
    );
  }
});
