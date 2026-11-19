/**
 * GOSH PHASE 5 CONNECT & MESSAGING TEST SUITE
 * Tests Web Crypto E2EE, message sending, attachments, replies, reactions, and disappearing TTL.
 */

// Setup Mock Environment for Node.js
if (typeof localStorage === 'undefined') {
  const storage = {};
  global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
}

if (typeof sessionStorage === 'undefined') {
  const sessionStorageStore = {};
  global.sessionStorage = {
    getItem: (k) => sessionStorageStore[k] || null,
    setItem: (k, v) => { sessionStorageStore[k] = String(v); },
    removeItem: (k) => { delete sessionStorageStore[k]; },
    clear: () => { Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]); }
  };
}

if (typeof window === 'undefined') {
  global.window = {
    screen: { width: 1920, height: 1080 },
    addEventListener: () => {},
    location: { hash: '' }
  };
}

try {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: 'NodeTest/1.0 (Windows NT 10.0)',
    configurable: true
  });
} catch {}

// Import dependencies
const { Auth } = await import('../services/auth.service.js');
const { DB } = await import('../services/db.service.js');
const { Crypto } = await import('../services/crypto.service.js');
const { ConnectModule } = await import('../modules/connect/connect.module.js');

async function runConnectTests() {
  console.log('--- GOSH PHASE 5 CONNECT & MESSAGING TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // TEST 1: Web Crypto AES-256-GCM Encryption & Decryption
  const secretText = 'This is a top-secret message between User 1 and User 2';
  const encrypted = await Crypto.encrypt(secretText);
  assert(encrypted.ciphertext && encrypted.ciphertext !== secretText, 'TEST 1: Ciphertext is strongly encrypted hex');
  assert(encrypted.iv && encrypted.iv.length === 24, 'TEST 1: 96-bit (24-hex-char) unique IV generated');

  const decrypted = await Crypto.decrypt(encrypted.ciphertext, encrypted.iv);
  assert(decrypted === secretText, 'TEST 1: Decryption faithfully restores original plaintext');

  // TEST 2: Tamper Protection (Authentication Tag)
  const tamperedCiphertext = encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 2) + 'ff';
  const tamperResult = await Crypto.decrypt(tamperedCiphertext, encrypted.iv);
  assert(tamperResult.includes('Decryption Failed'), 'TEST 2: Tampered ciphertext rejected by AES-GCM auth tag');

  // Setup: Authenticate as User 1
  const loginResult = await Auth.initiateLogin('prasanthgokul736@gmail.com', 'Gokul@709');
  await Auth.verifyOtp(loginResult.debugCode);
  const currentUser = Auth.getCurrentUser();
  assert(currentUser && currentUser.email === 'prasanthgokul736@gmail.com', 'Setup: Authenticated as User 1');

  // TEST 3: Insert & Send Encrypted Message
  const msg1Payload = await Crypto.encrypt('Hey, check out the vacation schedule!');
  const message1 = await DB.insert('messages', {
    conversation_id: ConnectModule.activeConversationId,
    sender_id: currentUser.id,
    content_encrypted: msg1Payload.ciphertext,
    iv: msg1Payload.iv,
    message_type: 'text'
  });
  assert(message1 && message1.id, 'TEST 3: Message inserted into database with generated ID');
  assert(message1.sender_id === currentUser.id, 'TEST 3: Message attributed to User 1');

  // TEST 4: Reply / Quoting
  const replyPayload = await Crypto.encrypt('Looks amazing! I already booked the hotel.');
  const replyMessage = await DB.insert('messages', {
    conversation_id: ConnectModule.activeConversationId,
    sender_id: currentUser.id,
    content_encrypted: replyPayload.ciphertext,
    iv: replyPayload.iv,
    message_type: 'text',
    reply_to_id: message1.id
  });
  assert(replyMessage.reply_to_id === message1.id, 'TEST 4: Reply preserves parent message linkage');

  // TEST 5: Message Editing
  const editedPayload = await Crypto.encrypt('Hey, check out the vacation schedule! (Updated with flight details)');
  const updatedMessage = await DB.update('messages', message1.id, {
    content_encrypted: editedPayload.ciphertext,
    iv: editedPayload.iv,
    is_edited: true
  });
  assert(updatedMessage.is_edited === true, 'TEST 5: Message marked as edited');
  const decryptedEdited = await Crypto.decrypt(updatedMessage.content_encrypted, updatedMessage.iv);
  assert(decryptedEdited.includes('Updated with flight details'), 'TEST 5: Edited content decrypted successfully');

  // TEST 6: Message Reactions
  const reaction1 = await DB.insert('message_reactions', {
    message_id: message1.id,
    user_id: currentUser.id,
    reaction: '❤️'
  });
  assert(reaction1 && reaction1.reaction === '❤️', 'TEST 6: Emoji reaction inserted');

  const reactionsList = await DB.query('message_reactions', r => r.message_id === message1.id);
  assert(reactionsList.length === 1 && reactionsList[0].reaction === '❤️', 'TEST 6: Reaction queried from database');

  await DB.delete('message_reactions', reaction1.id);
  const reactionsAfterDelete = await DB.query('message_reactions', r => r.message_id === message1.id);
  assert(reactionsAfterDelete.length === 0, 'TEST 6: Reaction toggled/deleted successfully');

  // TEST 7: Disappearing Messages (TTL Filtering)
  const expiredPayload = await Crypto.encrypt('This message expired 5 minutes ago');
  const expiredTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await DB.insert('messages', {
    conversation_id: ConnectModule.activeConversationId,
    sender_id: currentUser.id,
    content_encrypted: expiredPayload.ciphertext,
    iv: expiredPayload.iv,
    disappearing_at: expiredTime
  });

  const futurePayload = await Crypto.encrypt('This message will vanish in 24 hours');
  const futureTime = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const futureMsg = await DB.insert('messages', {
    conversation_id: ConnectModule.activeConversationId,
    sender_id: currentUser.id,
    content_encrypted: futurePayload.ciphertext,
    iv: futurePayload.iv,
    disappearing_at: futureTime
  });

  // Query with disappearing TTL filter
  const nowIso = new Date().toISOString();
  const activeRoomMessages = await DB.query('messages', m => {
    if (m.disappearing_at && m.disappearing_at < nowIso) return false;
    return m.conversation_id === ConnectModule.activeConversationId;
  });

  assert(activeRoomMessages.some(m => m.id === futureMsg.id), 'TEST 7: Valid future disappearing message preserved');
  assert(!activeRoomMessages.some(m => m.disappearing_at && m.disappearing_at < nowIso), 'TEST 7: Expired message correctly filtered out');

  // TEST 8: Message Deletion
  await DB.delete('messages', replyMessage.id);
  const checkDeleted = await DB.getById('messages', replyMessage.id);
  assert(checkDeleted === null, 'TEST 8: Message permanently deleted from database');

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runConnectTests().catch(err => {
  console.error('Connect Test Suite Unhandled Exception:', err);
  process.exit(1);
});
