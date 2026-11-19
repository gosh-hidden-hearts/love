/**
 * GOSH SMTP EMAIL SERVICE TEST SUITE
 * Verifies Gmail SMTP relay configuration, 2FA OTP formatting,
 * password reset dispatches, security alert formatting, and audit logs.
 */

import { SmtpConfig } from '../config/smtp.config.js';

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

const { Email } = await import('../services/email.service.js');
const { Auth } = await import('../services/auth.service.js');

async function runEmailTests() {
  console.log('--- GOSH SMTP EMAIL SERVICE TEST SUITE ---');
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

  // TEST 1: SMTP Server Configuration
  assert(SmtpConfig.host === 'smtp.gmail.com', 'TEST 1: SMTP Host configured as smtp.gmail.com');
  assert(SmtpConfig.port === 465 && SmtpConfig.secure === true, 'TEST 1: SMTP SSL port 465 enabled');
  assert(SmtpConfig.auth.user === 'gost81416@gmail.com', 'TEST 1: SMTP user matches gost81416@gmail.com');
  assert(SmtpConfig.auth.pass === 'vxue vwxa umcc waar', 'TEST 1: SMTP app password configured');
  assert(SmtpConfig.auth.cleanPass === 'vxuevwxaumccwaar', 'TEST 1: Clean 16-character password sanitized');

  // TEST 2: Send 6-Digit Email OTP
  Email.clearDispatchHistory();
  const otpResult = await Email.sendOtpCode('prasanthgokul736@gmail.com', '849543', 'Gokul');
  assert(otpResult.success === true, 'TEST 2: OTP email dispatched successfully');
  assert(otpResult.recipient === 'prasanthgokul736@gmail.com', 'TEST 2: Recipient matches User 1');
  assert(otpResult.dispatchedVia === 'gost81416@gmail.com', 'TEST 2: Relayed via gost81416@gmail.com');
  assert(otpResult.messageId.startsWith('smtp_'), 'TEST 2: Unique SMTP messageId generated');

  // TEST 3: Dispatch Audit Trail
  const history = Email.getDispatchHistory();
  assert(history.length === 1, 'TEST 3: Dispatch recorded in audit history');
  assert(history[0].subject.includes('849543'), 'TEST 3: Subject includes 6-digit OTP code');
  assert(history[0].authAccount === 'gost81416@gmail.com', 'TEST 3: Audit log tracks auth account');

  // TEST 4: Send Password Reset
  const resetResult = await Email.sendPasswordReset('sharanyasiva4@gmail.com', 'Sharanya');
  assert(resetResult.success === true, 'TEST 4: Password reset dispatched successfully');
  assert(resetResult.recipient === 'sharanyasiva4@gmail.com', 'TEST 4: Reset recipient matches User 2');

  // TEST 5: Send Security Alert
  const alertResult = await Email.sendSecurityAlert('prasanthgokul736@gmail.com', 'NEW_DEVICE_DETECTED', {
    platform: 'Android Mobile',
    ip: '192.168.1.1'
  });
  assert(alertResult.success === true, 'TEST 5: Critical security alert dispatched');

  // TEST 6: Integration with AuthService initiateLogin()
  localStorage.clear();
  sessionStorage.clear();
  Email.clearDispatchHistory();

  const loginRes = await Auth.initiateLogin('prasanthgokul736@gmail.com', 'Gokul@709');
  assert(loginRes.step === 'OTP_REQUIRED', 'TEST 6: Auth login initiation returns OTP_REQUIRED');
  const freshHistory = Email.getDispatchHistory();
  assert(freshHistory.length >= 1, 'TEST 6: Auth login triggers automated SMTP OTP dispatch');
  assert(freshHistory[0].to === 'prasanthgokul736@gmail.com', 'TEST 6: Automated OTP sent to logging-in user');
  assert(freshHistory[0].subject.includes(loginRes.debugCode), 'TEST 6: Dispatched email contains the matching OTP code');

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runEmailTests().catch(err => {
  console.error('Email Test Suite Unhandled Exception:', err);
  process.exit(1);
});
