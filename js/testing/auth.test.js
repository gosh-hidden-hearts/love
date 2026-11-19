/**
 * GOSH PHASE 2 AUTHENTICATION TEST SUITE
 * Verifies 2-user whitelist, multi-step OTP, device registration, and session revocation.
 */

import { FirebaseConfig } from '../config/firebase.config.js';

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
} catch {
  // Ignore if already set
}

// Import AuthService
const { Auth } = await import('../services/auth.service.js');

async function runAuthTests() {
  console.log('--- GOSH PHASE 2 AUTHENTICATION TEST SUITE ---');
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

  // TEST 1: Whitelist Rejection
  try {
    await Auth.initiateLogin('intruder@random.com', 'password123');
    assert(false, 'TEST 1: Unauthorized email must be rejected');
  } catch (err) {
    assert(err.message.includes('Access Denied'), 'TEST 1: Unauthorized email is strictly rejected by whitelist');
  }

  // TEST 2: Whitelist Acceptance for User 1
  let step1Result = null;
  try {
    step1Result = await Auth.initiateLogin('user1@gosh.internal', 'securepassword123');
    assert(step1Result.step === 'OTP_REQUIRED', 'TEST 2: Whitelisted User 1 accepted and prompted for OTP');
    assert(step1Result.debugCode && step1Result.debugCode.length === 6, 'TEST 2: 6-digit OTP code generated');
  } catch (err) {
    assert(false, `TEST 2: User 1 login initiation failed: ${err.message}`);
  }

  // TEST 3: Invalid OTP Rejection
  try {
    await Auth.verifyOtp('000000');
    assert(false, 'TEST 3: Wrong OTP code must be rejected');
  } catch (err) {
    assert(err.message.includes('Invalid 6-digit verification code'), 'TEST 3: Incorrect OTP is rejected');
  }

  // TEST 4: Valid OTP Verification & Session Minting
  try {
    const session = await Auth.verifyOtp(step1Result.debugCode);
    assert(session && session.userId && session.token, 'TEST 4: Correct OTP mints valid session');
    assert(Auth.isAuthenticated(), 'TEST 4: AuthService reports authenticated');
    assert(Auth.getCurrentUser().email === 'user1@gosh.internal', 'TEST 4: Current user email is User 1');
  } catch (err) {
    assert(false, `TEST 4: Valid OTP verification failed: ${err.message}`);
  }

  // TEST 5: Device Registration & Security Log
  const devices = Auth.getRegisteredDevices();
  assert(devices.length > 0, 'TEST 5: Device is registered upon login');
  assert(devices[0].deviceId === Auth.deviceId, 'TEST 5: Device ID matches current device fingerprint');

  const securityLogs = Auth.getSecurityEvents();
  assert(securityLogs.some(e => e.eventType === 'SUCCESSFUL_LOGIN'), 'TEST 5: SUCCESSFUL_LOGIN recorded in security audit trail');
  assert(securityLogs.some(e => e.eventType === 'UNAUTHORIZED_LOGIN_ATTEMPT'), 'TEST 5: UNAUTHORIZED_LOGIN_ATTEMPT recorded in audit log');

  // TEST 6: User 2 Whitelist Acceptance
  try {
    Auth.logout();
    assert(!Auth.isAuthenticated(), 'TEST 6: Logout successfully clears session');
    const u2Step1 = await Auth.initiateLogin('user2@gosh.internal', 'anotherpassword123');
    const u2Session = await Auth.verifyOtp(u2Step1.debugCode);
    assert(u2Session.email === 'user2@gosh.internal', 'TEST 6: Whitelisted User 2 successfully logs in');
  } catch (err) {
    assert(false, `TEST 6: User 2 login failed: ${err.message}`);
  }

  // TEST 7: Remote Device Revocation
  const initialCount = Auth.getRegisteredDevices().length;
  Auth.revokeAllOtherDevices();
  const allDevices = Auth.getRegisteredDevices();
  const otherDevices = allDevices.filter(d => d.deviceId !== Auth.deviceId);
  assert(otherDevices.every(d => d.revoked === true), 'TEST 7: All other devices successfully marked revoked');

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runAuthTests().catch(err => {
  console.error('Test Suite Unhandled Exception:', err);
  process.exit(1);
});
