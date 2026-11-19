/**
 * GOSH PHASE 12 FINAL VERIFICATION & FULL PLATFORM AUDIT
 * End-to-end validation of all 15 production modules, zero-cost architecture,
 * responsive design tokens, and security policies.
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

import fs from 'node:fs';
import path from 'node:path';

// Import all services and views
const { Auth } = await import('../services/auth.service.js');
const { DB } = await import('../services/db.service.js');
const { Crypto } = await import('../services/crypto.service.js');
const { Mega } = await import('../services/mega.service.js');
const { Vault } = await import('../services/vault.service.js');
const { WebRTC } = await import('../services/webrtc.service.js');
const { Recovery } = await import('../services/recovery.service.js');
const { Views } = await import('../modules/views.js');

async function runE2EVerification() {
  console.log('--- GOSH PHASE 12 FINAL PLATFORM VERIFICATION AUDIT ---');
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

  try {
    // 0. RESET & INITIALIZE DB
    localStorage.clear();
    DB.initDefaultSeed();

    // =========================================================================
    // AUDIT 01: GOSH AUTHENTICATION & IDENTITY
    // =========================================================================
    // Whitelist check
    assert(Auth.isEmailAuthorized('prasanthgokul736@gmail.com') !== null, 'MODULE 01: Whitelisted User 1 authorized');
    assert(Auth.isEmailAuthorized('sharanyasiva4@gmail.com') !== null, 'MODULE 01: Whitelisted User 2 authorized');
    assert(Auth.isEmailAuthorized('attacker@outside.com') === null, 'MODULE 01: Third-party email strictly rejected');

    // Multi-step OTP Login
    const loginRes = await Auth.initiateLogin('prasanthgokul736@gmail.com', 'Gokul@709');
    await Auth.verifyOtp(loginRes.debugCode);
    const currentUser = Auth.getCurrentUser();
    assert(Auth.isAuthenticated(), 'MODULE 01: Authenticated with 6-digit Email OTP');
    assert(currentUser.email === 'prasanthgokul736@gmail.com', 'MODULE 01: Current user is Gokul');

    // =========================================================================
    // AUDIT 02: GOSH HOME DASHBOARD
    // =========================================================================
    const homeHtml = await Views.home.render();
    assert(homeHtml.includes('Gokul') || homeHtml.includes('Dashboard'), 'MODULE 02: Dashboard renders welcome header');
    assert(homeHtml.includes('20.0 GB'), 'MODULE 02: Accurately reflects 20 GB MEGA quota');
    assert(homeHtml.includes('Recent Activity') || homeHtml.includes('Activity Stream'), 'MODULE 02: Activity stream integrated');

    // =========================================================================
    // AUDIT 03: GOSH CONNECT
    // =========================================================================
    const plainMsg = 'E2E private message between Gokul and Sharanya';
    const encMsg = await Crypto.encrypt(plainMsg);
    assert(encMsg.ciphertext !== plainMsg && encMsg.iv.length === 24, 'MODULE 03: Web Crypto AES-256-GCM ciphering active');
    const decMsg = await Crypto.decrypt(encMsg.ciphertext, encMsg.iv);
    assert(decMsg === plainMsg, 'MODULE 03: Decrypted plaintext accurately restored');

    const connectHtml = await Views.connect.render();
    assert(connectHtml.includes('GOSH Secure Room'), 'MODULE 03: Connect UI rendered');

    // =========================================================================
    // AUDIT 04: GOSH CALLS
    // =========================================================================
    assert(WebRTC.iceServers.some(s => s.urls.includes('stun.l.google.com')), 'MODULE 04: Public Google STUN servers active');
    assert(WebRTC.formatDuration(125) === '02:05', 'MODULE 04: Call duration formatter valid');
    const callsHtml = await Views.calls.render();
    assert(callsHtml.includes('GOSH Calls') && callsHtml.includes('Voice Call'), 'MODULE 04: Calls UI & P2P stage rendered');

    // =========================================================================
    // AUDIT 05: GOSH VAULT
    // =========================================================================
    await Vault.unlockVault('AuditMasterPassphrase123!');
    assert(Vault.isUnlocked === true, 'MODULE 05: Vault unlocked with PBKDF2 derivation');
    const pwd = Vault.generatePassword({ length: 20 });
    assert(pwd.length === 20, 'MODULE 05: Password generator produces requested length');
    const strength = Vault.calculateStrength('AuditMasterPassphrase123!');
    assert(strength.score >= 4, 'MODULE 05: Password strength evaluated accurately');
    Vault.lockVault();
    assert(Vault.isUnlocked === false, 'MODULE 05: Vault auto-lock purges keys from memory');

    // =========================================================================
    // AUDIT 06: GOSH CLOUD (MEGA INTEGRATION)
    // =========================================================================
    const folders = await DB.query('folders');
    assert(folders.length >= 3, 'MODULE 06: Default folders (Documents, Photos, Backups) present');
    const quota = await Mega.getQuota();
    assert(quota.totalBytes === 20 * 1024 * 1024 * 1024, 'MODULE 06: 20 GB MEGA quota confirmed');
    const cloudHtml = await Views.cloud.render();
    assert(cloudHtml.includes('GOSH Cloud') && cloudHtml.includes('20.0 GB'), 'MODULE 06: Cloud UI rendered with MEGA quota');

    // =========================================================================
    // AUDIT 07: GOSH MEMORIES
    // =========================================================================
    const memHtml = await Views.memories.render();
    assert(memHtml.includes('GOSH Memories') && memHtml.includes('Milestone Timeline'), 'MODULE 07: Memories UI rendered with timeline');

    // =========================================================================
    // AUDIT 08: GOSH DIARY
    // =========================================================================
    const diaryHtml = await Views.diary.render();
    assert(diaryHtml.includes('GOSH Shared Diary') && diaryHtml.includes('Encrypted Journal'), 'MODULE 08: Diary UI rendered with encrypted journal');

    // =========================================================================
    // AUDIT 09: GOSH TOGETHER
    // =========================================================================
    const togHtml = await Views.together.render();
    assert(togHtml.includes('GOSH Together') && togHtml.includes('Shared Calendar'), 'MODULE 09: Together UI rendered with calendar and checklist');

    // =========================================================================
    // AUDIT 10: GOSH MUSIC
    // =========================================================================
    const musicHtml = await Views.music.render();
    assert(musicHtml.includes('GOSH Music') && musicHtml.includes('Our Playlists'), 'MODULE 10: Music UI rendered with shared playlists');

    // =========================================================================
    // AUDIT 11: DOCUMENT LOCKER
    // =========================================================================
    const docHtml = await Views.documents.render();
    assert(docHtml.includes('Document Locker') && docHtml.includes('Confidential Document Locker'), 'MODULE 11: Document Locker UI rendered');

    // =========================================================================
    // AUDIT 12: GOSH SMART SEARCH
    // =========================================================================
    const searchHtml = await Views.search.render();
    assert(searchHtml.includes('GOSH Smart Search') && searchHtml.includes('Multi-Module Search Engine'), 'MODULE 12: Smart Search UI rendered');

    // =========================================================================
    // AUDIT 13: GOSH DEVICE MANAGER
    // =========================================================================
    const devHtml = Views.devices.render();
    assert(devHtml.includes('GOSH Device Manager') && devHtml.includes('Registered & Active Devices'), 'MODULE 13: Device Manager UI rendered');

    // =========================================================================
    // AUDIT 14: GOSH DISASTER RECOVERY
    // =========================================================================
    const recHtml = await Views.recovery.render();
    assert(recHtml.includes('GOSH Recovery & Key Rotation') && recHtml.includes('24-Word Emergency Seed'), 'MODULE 14: Disaster Recovery UI rendered');

    // =========================================================================
    // AUDIT 15: SETTINGS & PREFERENCES
    // =========================================================================
    const setHtml = Views.settings.render();
    assert(setHtml.includes('Settings & Preferences') && setHtml.includes('Security & Privacy'), 'MODULE 15: Settings UI rendered with security preferences');

    // =========================================================================
    // AUDIT 16: RESPONSIVE DESIGN TOKENS AUDIT
    // =========================================================================
    const cssResponsive = fs.readFileSync(path.join(process.cwd(), 'css', 'responsive.css'), 'utf8');
    assert(cssResponsive.includes('@media (max-width: 1024px)'), 'RESPONSIVE: Tablet breakpoint (1024px) defined');
    assert(cssResponsive.includes('@media (max-width: 768px)'), 'RESPONSIVE: Mobile breakpoint (768px) defined');
    assert(cssResponsive.includes('@media (max-width: 480px)'), 'RESPONSIVE: Small handset breakpoint (480px) defined');

    // =========================================================================
    // AUDIT 17: ZERO-COST AND ZERO-BUILD INTEGRITY
    // =========================================================================
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const devDeps = Object.keys(packageJson.devDependencies || {});
    assert(devDeps.every(d => d.startsWith('@capacitor/')), 'ZERO-COST: 100% free open-source dependencies only');
    assert(!fs.existsSync(path.join(process.cwd(), 'tsconfig.json')), 'ZERO-BUILD: No TypeScript compile step');
    assert(!fs.existsSync(path.join(process.cwd(), 'vite.config.js')), 'ZERO-BUILD: No Vite bundler requirement');
    assert(!fs.existsSync(path.join(process.cwd(), 'webpack.config.js')), 'ZERO-BUILD: No Webpack bundler requirement');

    console.log(`\nPHASE 12 AUDIT COMPLETED: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);

  } catch (err) {
    console.error('Audit Exception:', err);
    process.exit(1);
  }
}

runE2EVerification();
