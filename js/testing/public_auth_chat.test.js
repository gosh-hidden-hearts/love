/**
 * GOSH TEST SUITE: PUBLIC REGISTRATION, USER DISCOVERY, CHAT & PROFILE
 * Tests public registration, multi-field login, search, profile updates, and contacts.
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
} catch (e) {}

// Dynamic imports after mocks
const { Auth } = await import('../services/auth.service.js');
const { DB } = await import('../services/db.service.js');
const { ConnectModule } = await import('../modules/connect/connect.module.js');

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS] ${message}`);
  }
}

async function runTests() {
  console.log('--- GOSH PUBLIC REGISTRATION, DISCOVERY & CHAT TEST SUITE ---');

  // 1. Validation on Public Registration
  try {
    await Auth.register({
      fullName: 'A',
      username: 'valid_user',
      email: 'test@example.com',
      phone: '+1 555-0100',
      password: 'password123',
      confirmPassword: 'password123'
    });
    assert(false, 'Should have failed for short name');
  } catch (err) {
    assert(err.message.includes('full name'), 'Short full name strictly rejected');
  }

  try {
    await Auth.register({
      fullName: 'Alice Walker',
      username: 'a', // too short
      email: 'alice@example.com',
      phone: '+1 555-0100',
      password: 'password123',
      confirmPassword: 'password123'
    });
    assert(false, 'Should have failed for short username');
  } catch (err) {
    assert(err.message.includes('Username must be'), 'Invalid username strictly rejected');
  }

  try {
    await Auth.register({
      fullName: 'Alice Walker',
      username: 'alicewalker',
      email: 'alice@example.com',
      phone: '+1 555-0100',
      password: 'password123',
      confirmPassword: 'mismatchpassword'
    });
    assert(false, 'Should have failed for mismatched passwords');
  } catch (err) {
    assert(err.message.includes('match'), 'Mismatched passwords strictly rejected');
  }

  // 2. Successful Public Registration & OTP Dispatch
  const regResult = await Auth.register({
    fullName: 'Elena Rostova',
    username: 'elena_r',
    email: 'elena.rostova@example.com',
    phone: '+1 555-0999',
    password: 'ElenaSecure@2026',
    confirmPassword: 'ElenaSecure@2026',
    bio: 'Art curator and traveler.'
  });

  assert(regResult.step === 'OTP_REQUIRED', 'Registration triggers OTP_REQUIRED step');
  assert(regResult.debugCode && regResult.debugCode.length === 6, 'Valid 6-digit OTP code generated');
  assert(regResult.email === 'elena.rostova@example.com', 'OTP sent to registered email');

  // Verify OTP to finalize registration
  const session = await Auth.verifyOtp(regResult.debugCode);
  assert(session && session.userId, 'Valid session token minted upon OTP verification');
  assert(Auth.isAuthenticated(), 'AuthService reports user is authenticated');
  assert(Auth.getCurrentUser().displayName === 'Elena Rostova', 'Current user displayName matches registered name');

  // 3. Prevent Duplicate Registration
  try {
    await Auth.register({
      fullName: 'Elena Rostova Duplicate',
      username: 'elena_r',
      email: 'other@example.com',
      phone: '+1 555-1111',
      password: 'ElenaSecure@2026',
      confirmPassword: 'ElenaSecure@2026'
    });
    assert(false, 'Should reject duplicate username');
  } catch (err) {
    assert(err.message.includes('already taken'), 'Duplicate username strictly rejected');
  }

  try {
    await Auth.register({
      fullName: 'Elena Rostova Duplicate',
      username: 'elena_unique_2',
      email: 'elena.rostova@example.com',
      phone: '+1 555-1111',
      password: 'ElenaSecure@2026',
      confirmPassword: 'ElenaSecure@2026'
    });
    assert(false, 'Should reject duplicate email');
  } catch (err) {
    assert(err.message.includes('already registered'), 'Duplicate email address strictly rejected');
  }

  // 4. Multi-Field Login
  Auth.logout();
  assert(!Auth.isAuthenticated(), 'Session purged on logout');

  // 4A. Login with Username
  const loginUser = await Auth.initiateLogin('elena_r', 'ElenaSecure@2026');
  assert(loginUser.step === 'OTP_REQUIRED', 'Login with unique username succeeded');
  await Auth.verifyOtp(loginUser.debugCode);
  assert(Auth.getCurrentUser().displayName === 'Elena Rostova', 'Authenticated via username');

  Auth.logout();

  // 4B. Login with Mobile Phone Number
  const loginPhone = await Auth.initiateLogin('+1 555-0999', 'ElenaSecure@2026');
  assert(loginPhone.step === 'OTP_REQUIRED', 'Login with mobile phone succeeded');
  await Auth.verifyOtp(loginPhone.debugCode);
  assert(Auth.getCurrentUser().displayName === 'Elena Rostova', 'Authenticated via mobile number');

  // 5. User Discovery & Search
  const curUser = Auth.getCurrentUser();
  const searchResults = Auth.searchUsers('elena', 'some-other-id');
  assert(searchResults.length > 0, 'User found via search query');
  assert(searchResults[0].username === 'elena_r', 'Search returns matching user');
  assert(!searchResults[0].passwordHash, 'Security: Passwords never exposed in search results');

  // 6. Profile Updates
  const updated = await Auth.updateProfile(curUser.id, {
    fullName: 'Elena Rostova-Smith',
    bio: 'Updated bio for testing.'
  });
  assert(updated.fullName === 'Elena Rostova-Smith', 'Profile full name updated');
  assert(updated.bio === 'Updated bio for testing.', 'Profile bio updated');
  assert(Auth.getCurrentUser().displayName === 'Elena Rostova-Smith', 'Active session reflects profile changes');

  // 7. WhatsApp Connect & Contacts Rendering
  ConnectModule.selectedContact = null;
  const contactsHtml = await ConnectModule.render();
  assert(typeof contactsHtml === 'string', 'ConnectModule renders contacts view HTML');
  assert(contactsHtml.includes('Chats & Discover'), 'ConnectModule includes Chats & Discover title');
  assert(contactsHtml.includes('contact-search-input'), 'ConnectModule includes user discovery search input');

  // Switch to Active Chat
  ConnectModule.selectedContact = {
    id: 'u_test_partner',
    fullName: 'Sophia Laurent',
    displayName: 'Sophia Laurent',
    username: 'sophia'
  };
  const activeChatHtml = await ConnectModule.render();
  assert(activeChatHtml.includes('chat-back-to-contacts-btn'), 'Active chat provides back button to contacts');
  assert(activeChatHtml.includes('direct-voice-call-btn'), 'Active chat provides voice call action');
  assert(activeChatHtml.includes('direct-video-call-btn'), 'Active chat provides video call action');
  assert(activeChatHtml.includes('chat-send-btn'), 'Active chat provides WhatsApp-style composer send button');

  console.log('\nTEST RESULTS: All Public Registration, Discovery & Chat Tests Passed (100%).');
}

runTests().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
