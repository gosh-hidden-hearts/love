import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

// Ensure test env has valid non-empty config before importing modules
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://azwclorwxrzgofmribms.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-suite';
process.env.FIREBASE_PROJECT_ID = 'gosh-81416';

const { supabase } = await import('../src/config/supabase.js');
const { verifyFirebaseIdToken } = await import('../src/services/firebaseAuthService.js');
const { requireFirebaseToken, authenticateToken } = await import('../src/middleware/authMiddleware.js');
const { authController } = await import('../src/controllers/authController.js');
const { userController } = await import('../src/controllers/userController.js');
const { conversationController } = await import('../src/controllers/conversationController.js');
const { messageController } = await import('../src/controllers/messageController.js');

// In-memory PostgreSQL/PostgREST simulator validating UUIDs & schema constraints
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createInMemorySupabase() {
  const tables = {
    users: [],
    user_profiles: [],
    user_identifiers: [],
    user_settings: [],
    contacts: [],
    blocked_users: [],
    conversations: [],
    conversation_members: [],
    messages: [],
    message_reactions: []
  };

  function makeBuilder(tableName) {
    const state = {
      op: 'select',
      selectCols: '*',
      filters: [],
      payload: null,
      orderCol: null,
      orderAsc: true,
      limitCount: null,
      singleMode: null
    };

    const builder = {
      select(cols = '*') {
        if (state.op === 'select') state.selectCols = cols;
        return builder;
      },
      insert(rows) {
        state.op = 'insert';
        state.payload = rows;
        return builder;
      },
      update(patch) {
        state.op = 'update';
        state.payload = patch;
        return builder;
      },
      upsert(rows) {
        state.op = 'upsert';
        state.payload = rows;
        return builder;
      },
      delete() {
        state.op = 'delete';
        return builder;
      },
      eq(col, val) {
        if ((col === 'id' || col.endsWith('_id')) && !col.includes('.') && val !== null && !UUID_REGEX.test(String(val))) {
          state.typeError = { code: '22P02', message: `invalid input syntax for type uuid: "${val}"` };
        }
        if (col.includes('.')) {
          const [rel, relCol] = col.split('.');
          state.filters.push((row) => !row[rel] || row[rel][relCol] === val);
          state.postJoinFilters = state.postJoinFilters || [];
          state.postJoinFilters.push((row) => row[rel]?.[relCol] === val);
        } else {
          state.filters.push((row) => row[col] === val);
        }
        return builder;
      },
      neq(col, val) {
        state.filters.push((row) => row[col] !== val);
        return builder;
      },
      in(col, vals) {
        state.filters.push((row) => vals.includes(row[col]));
        return builder;
      },
      ilike(col, pattern) {
        const needle = pattern
          .replace(/^%|%$/g, '')
          .replace(/\\([%_\\])/g, '$1')
          .toLowerCase();
        state.filters.push((row) => String(row[col] || '').toLowerCase().includes(needle));
        return builder;
      },
      or() {
        return builder;
      },
      order(col, opts = {}) {
        state.orderCol = col;
        state.orderAsc = opts.ascending !== false;
        return builder;
      },
      limit(n) {
        state.limitCount = n;
        return builder;
      },
      maybeSingle() {
        state.singleMode = 'maybe';
        return execute();
      },
      single() {
        state.singleMode = 'single';
        return execute();
      },
      then(resolve, reject) {
        return execute().then(resolve, reject);
      }
    };

    async function execute() {
      if (state.typeError) {
        return { data: null, error: state.typeError };
      }
      const rows = tables[tableName] || (tables[tableName] = []);
      const match = (r) => state.filters.every((fn) => fn(r));

      if (state.op === 'insert') {
        const inserted = state.payload.map((item) => {
          const copy = {
            created_at: new Date().toISOString(),
            ...item
          };
          if (!copy.id && tableName !== 'user_profiles' && tableName !== 'user_settings') {
            copy.id = crypto.randomUUID();
          }
          rows.push(copy);
          return { ...copy };
        });
        if (state.singleMode) return { data: inserted[0] || null, error: null };
        return { data: inserted, error: null };
      }

      if (state.op === 'upsert') {
        const upserted = state.payload.map((item) => {
          let existing = null;
          if (tableName === 'user_settings') {
            existing = rows.find((r) => r.user_id === item.user_id);
          } else if (tableName === 'user_identifiers') {
            existing = rows.find(
              (r) => r.identifier_type === item.identifier_type && r.identifier_value === item.identifier_value
            );
          } else if (tableName === 'contacts') {
            existing = rows.find((r) => r.user_id === item.user_id && r.contact_user_id === item.contact_user_id);
          } else if (tableName === 'conversation_members') {
            existing = rows.find((r) => r.conversation_id === item.conversation_id && r.user_id === item.user_id);
          }
          if (existing) {
            Object.assign(existing, item);
            return { ...existing };
          }
          const copy = { created_at: new Date().toISOString(), ...item };
          rows.push(copy);
          return { ...copy };
        });
        return { data: upserted, error: null };
      }

      if (state.op === 'update') {
        const updated = [];
        for (const r of rows) {
          if (match(r)) {
            Object.assign(r, state.payload);
            updated.push({ ...r });
          }
        }
        if (state.singleMode) return { data: updated[0] || null, error: null };
        return { data: updated, error: null };
      }

      if (state.op === 'delete') {
        tables[tableName] = rows.filter((r) => !match(r));
        return { data: null, error: null };
      }

      // Enforce PostgREST PGRST201 ambiguity if implicit multi-FK embeds are attempted!
      if (state.selectCols.includes('user_profiles')) {
        return {
          data: null,
          error: {
            code: 'PGRST201',
            message: "Could not embed because more than one relationship was found for 'users' and 'user_profiles'"
          }
        };
      }
      if (tableName === 'user_profiles' && state.selectCols.includes('users') && !state.selectCols.includes('!')) {
        return {
          data: null,
          error: {
            code: 'PGRST201',
            message: "Could not embed because more than one relationship was found for 'users' and 'user_profiles'"
          }
        };
      }

      // SELECT with flat joins used by repository
      let matched = rows.filter(match).map((r) => ({ ...r }));

      if (tableName === 'contacts' && state.selectCols.includes('contact_user')) {
        matched = matched.map((c) => {
          const u = tables.users.find((x) => x.id === c.contact_user_id);
          const p = tables.user_profiles.find((x) => x.user_id === c.contact_user_id);
          return { ...c, contact_user: u ? { ...u, user_profiles: p || null } : null };
        });
      }
      if (tableName === 'conversation_members') {
        if (state.selectCols.includes('conversations!inner')) {
          matched = matched
            .map((m) => ({
              ...m,
              conversations: tables.conversations.find((c) => c.id === m.conversation_id)
            }))
            .filter((m) => m.conversations && m.conversations.type === 'direct');
        } else if (state.selectCols.includes('conversations(*)')) {
          matched = matched.map((m) => ({
            ...m,
            conversations: tables.conversations.find((c) => c.id === m.conversation_id) || null
          }));
        }
        if (state.selectCols.includes('users(')) {
          matched = matched.map((m) => {
            const u = tables.users.find((x) => x.id === m.user_id);
            const p = tables.user_profiles.find((x) => x.user_id === m.user_id);
            return { ...m, users: u ? { ...u, user_profiles: p || null } : null };
          });
        }
      }
      if (tableName === 'conversations' && state.selectCols.includes('conversation_members')) {
        matched = matched.map((c) => ({
          ...c,
          conversation_members: tables.conversation_members.filter((m) => m.conversation_id === c.id)
        }));
      }
      if (tableName === 'messages' && state.selectCols.includes('message_reactions')) {
        matched = matched.map((m) => ({
          ...m,
          message_reactions: tables.message_reactions.filter((mr) => mr.message_id === m.id)
        }));
      }

      if (state.postJoinFilters?.length) {
        matched = matched.filter((r) => state.postJoinFilters.every((fn) => fn(r)));
      }
      if (state.orderCol) {
        matched.sort((a, b) => {
          const cmp = new Date(a[state.orderCol] || 0) - new Date(b[state.orderCol] || 0);
          return state.orderAsc ? cmp : -cmp;
        });
      }
      if (state.limitCount !== null) matched = matched.slice(0, state.limitCount);

      if (state.singleMode === 'maybe') return { data: matched[0] || null, error: null };
      if (state.singleMode === 'single') return { data: matched[0] || null, error: matched[0] ? null : { message: 'Not found' } };
      return { data: matched, error: null };
    }

    return builder;
  }

  return { tables, from: makeBuilder };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

test('End-to-end two-account Firebase verification, Supabase sync, username search, contacts & chat persistence', async () => {
  // 1. Setup RSA keypair for Firebase ID token verification test
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const originalFetch = globalThis.fetch;
  const originalFrom = supabase.from;
  const fakeDb = createInMemorySupabase();

  globalThis.fetch = async (url) => {
    if (String(url).includes('securetoken@system.gserviceaccount.com')) {
      return {
        ok: true,
        headers: new Headers({ 'cache-control': 'max-age=3600' }),
        json: async () => ({ 'test-kid-1': publicKey })
      };
    }
    return originalFetch(url);
  };
  supabase.from = fakeDb.from;

  try {
    const signFirebaseToken = ({ uid, email, name }) =>
      jwt.sign(
        {
          sub: uid,
          email,
          email_verified: true,
          name,
          auth_time: Math.floor(Date.now() / 1000) - 5
        },
        privateKey,
        {
          algorithm: 'RS256',
          keyid: 'test-kid-1',
          audience: 'gosh-81416',
          issuer: 'https://securetoken.google.com/gosh-81416',
          expiresIn: '1h'
        }
      );

    // 2. Reject spoofed sync-user request without Firebase token
    const unauthReq = { headers: {}, body: { firebaseUid: 'spoof-uid', email: 'victim@example.com' } };
    const unauthRes = mockRes();
    let nextCalled = false;
    await requireFirebaseToken(unauthReq, unauthRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(unauthRes.statusCode, 401);

    // 3. Account A Registration & Sync
    const tokenA = signFirebaseToken({ uid: 'fb-uid-alice', email: 'alice@example.com', name: 'Alice Heart' });
    const verifiedA = await verifyFirebaseIdToken(tokenA);
    assert.strictEqual(verifiedA.uid, 'fb-uid-alice');

    const syncReqA = {
      firebaseUser: verifiedA,
      body: { displayName: 'Alice Heart', username: 'alice_heart' }
    };
    const syncResA = mockRes();
    await authController.syncUser(syncReqA, syncResA);
    assert.strictEqual(syncResA.statusCode, 200);
    assert.strictEqual(syncResA.body.success, true);
    assert.ok(UUID_REGEX.test(syncResA.body.user.id));
    assert.strictEqual(syncResA.body.user.firebase_uid, 'fb-uid-alice');
    assert.strictEqual(syncResA.body.profile.display_name, 'Alice Heart');
    assert.strictEqual(fakeDb.tables.users.length, 1);
    assert.strictEqual(fakeDb.tables.user_profiles.length, 1);
    assert.strictEqual(fakeDb.tables.user_identifiers.length, 2); // email + username

    // 4. Account A Re-Login Sync (idempotent: must NOT create duplicate user/profile)
    const loginResA = mockRes();
    await authController.syncUser({ firebaseUser: verifiedA, body: {} }, loginResA);
    assert.strictEqual(loginResA.statusCode, 200);
    assert.strictEqual(loginResA.body.user.id, syncResA.body.user.id);
    assert.strictEqual(fakeDb.tables.users.length, 1);
    assert.strictEqual(fakeDb.tables.user_profiles.length, 1);

    // 5. Account B Registration & Sync
    const tokenB = signFirebaseToken({ uid: 'fb-uid-bob', email: 'bob@example.com', name: 'Bob Soul' });
    const verifiedB = await verifyFirebaseIdToken(tokenB);
    const syncResB = mockRes();
    await authController.syncUser(
      { firebaseUser: verifiedB, body: { displayName: 'Bob Soul', username: 'bob_soul' } },
      syncResB
    );
    assert.strictEqual(syncResB.statusCode, 200);
    assert.strictEqual(fakeDb.tables.users.length, 2);
    assert.strictEqual(fakeDb.tables.user_profiles.length, 2);

    const aliceId = syncResA.body.user.id;
    const bobId = syncResB.body.user.id;

    // 6. Verify authenticateToken works with backend JWT
    const authReq = { headers: { authorization: `Bearer ${syncResA.body.token}` } };
    const authRes = mockRes();
    let authed = false;
    await authenticateToken(authReq, authRes, () => {
      authed = true;
    });
    assert.strictEqual(authed, true);
    assert.strictEqual(authReq.user.id, aliceId);

    // 7. Username Search (Alice searches for "bob_soul" — must not crash on UUID, must return camelCase)
    const searchRes = mockRes();
    await userController.searchUsers({ query: { q: 'bob_soul' }, user: { id: aliceId } }, searchRes);
    assert.strictEqual(searchRes.statusCode, 200);
    assert.strictEqual(searchRes.body.users.length, 1);
    assert.strictEqual(searchRes.body.users[0].id, bobId);
    assert.strictEqual(searchRes.body.users[0].displayName, 'Bob Soul');
    assert.strictEqual(searchRes.body.users[0].email, undefined);

    // 8. Messaging blocked BEFORE adding contact
    const blockedConvRes = mockRes();
    await conversationController.createConversation(
      { user: { id: aliceId }, body: { partnerId: bobId, name: 'Bob Soul' } },
      blockedConvRes
    );
    assert.strictEqual(blockedConvRes.statusCode, 403);
    assert.strictEqual(blockedConvRes.body.code, 'NOT_A_CONTACT');

    // 9. Alice adds Bob as contact, Bob adds Alice as contact
    const addContactA = mockRes();
    await userController.addContact({ user: { id: aliceId }, body: { contactUserId: bobId, nickname: 'Bobby' } }, addContactA);
    assert.strictEqual(addContactA.statusCode, 200);

    const addContactB = mockRes();
    await userController.addContact({ user: { id: bobId }, body: { contactUserId: aliceId } }, addContactB);
    assert.strictEqual(addContactB.statusCode, 200);

    // 10. Create conversation (canonical UUID) & deduplicate across Alice and Bob
    const convResA = mockRes();
    await conversationController.createConversation(
      { user: { id: aliceId }, body: { partnerId: bobId, name: 'Bobby' } },
      convResA
    );
    assert.strictEqual(convResA.statusCode, 200);
    assert.ok(UUID_REGEX.test(convResA.body.conversation.id));
    assert.strictEqual(fakeDb.tables.conversation_members.length, 2);

    const convResB = mockRes();
    await conversationController.createConversation(
      { user: { id: bobId }, body: { partnerId: aliceId, name: 'Alice' } },
      convResB
    );
    assert.strictEqual(convResB.body.conversation.id, convResA.body.conversation.id);

    // 11. Alice sends message -> persisted -> Bob retrieves it
    const convId = convResA.body.conversation.id;
    const sendResA = mockRes();
    await messageController.sendMessage(
      { user: { id: aliceId }, body: { conversationId: convId, content: 'Hello Bob ❤️', messageType: 'text' } },
      sendResA
    );
    assert.strictEqual(sendResA.statusCode, 200);
    assert.strictEqual(sendResA.body.message.content, 'Hello Bob ❤️');

    const getResB = mockRes();
    await messageController.getMessages({ params: { conversationId: convId }, user: { id: bobId } }, getResB);
    assert.strictEqual(getResB.statusCode, 200);
    assert.strictEqual(getResB.body.messages.length, 1);
    assert.strictEqual(getResB.body.messages[0].content, 'Hello Bob ❤️');
    assert.strictEqual(getResB.body.messages[0].senderId, aliceId);
  } finally {
    globalThis.fetch = originalFetch;
    supabase.from = originalFrom;
  }
});
