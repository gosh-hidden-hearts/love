/**
 * GOSH PHASE 4 DASHBOARD & TELEMETRY TEST SUITE
 * Tests telemetry math, time formatting, live aggregation, and reactivity.
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
const { DashboardModule } = await import('../modules/dashboard/dashboard.module.js');

async function runDashboardTests() {
  console.log('--- GOSH PHASE 4 DASHBOARD & TELEMETRY TEST SUITE ---');
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

  // TEST 1: Byte Formatting Utility
  assert(DashboardModule.formatBytes(0) === '0 B', 'TEST 1: 0 bytes formatted as "0 B"');
  assert(DashboardModule.formatBytes(1024) === '1 KB', 'TEST 1: 1024 bytes formatted as "1 KB"');
  assert(DashboardModule.formatBytes(1048576) === '1 MB', 'TEST 1: 1048576 bytes formatted as "1 MB"');
  assert(DashboardModule.formatBytes(5368709120) === '5 GB', 'TEST 1: 5GB formatted accurately');

  // TEST 2: Time Formatting Utility
  assert(DashboardModule.formatTimeAgo(new Date().toISOString()) === 'Just now', 'TEST 2: Instant timestamp returns "Just now"');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  assert(DashboardModule.formatTimeAgo(twoHoursAgo) === '2h ago', 'TEST 2: 2 hours ago returns "2h ago"');

  // TEST 3: Time of Day Greeting
  const greeting = DashboardModule.getTimeGreeting();
  assert(['Good morning', 'Good afternoon', 'Good evening'].includes(greeting), 'TEST 3: Valid localized time greeting generated');

  // Setup: Authenticate User 1
  const loginResult = await Auth.initiateLogin('user1@gosh.internal', 'securepassword123');
  await Auth.verifyOtp(loginResult.debugCode);
  assert(Auth.isAuthenticated(), 'Setup: Authenticated as User 1');

  // Insert mock files into DB to test storage telemetry calculation
  await DB.insert('files', {
    name: 'Passport_Copy.pdf',
    file_size: 2097152, // 2 MB
    mime_type: 'application/pdf',
    mega_handle: 'v123_mega_node',
    category: 'document'
  });
  await DB.insert('files', {
    name: 'Beach_Sunset.jpg',
    file_size: 5242880, // 5 MB
    mime_type: 'image/jpeg',
    mega_handle: 'v456_mega_node',
    category: 'memory'
  });

  // Insert mock vault item
  await DB.insert('vault_items', {
    title: 'Bank Portal',
    category: 'login',
    data_encrypted: 'cipher_data',
    iv: 'iv_data',
    auth_tag: 'tag_data'
  });

  // Insert future calendar event
  const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await DB.insert('calendar_events', {
    title: 'Weekend Anniversary Dinner',
    start_time: futureDate,
    end_time: futureDate,
    category: 'anniversary'
  });

  // TEST 4: Render Live Dashboard with Actual Data
  const htmlOutput = await DashboardModule.render();
  assert(typeof htmlOutput === 'string' && htmlOutput.length > 500, 'TEST 4: Dashboard rendered comprehensive HTML');
  assert(htmlOutput.includes('7 MB'), 'TEST 4: Real storage usage (2MB + 5MB = 7MB) accurately calculated and displayed');
  assert(htmlOutput.includes('/ 20.0 GB'), 'TEST 4: MEGA 20.0 GB free tier quota displayed');
  assert(htmlOutput.includes('2 Files'), 'TEST 4: Actual file count (2 Files) displayed in storage card');
  assert(htmlOutput.includes('1 Credentials Protected'), 'TEST 4: Vault credentials telemetry reflects real DB count');
  assert(htmlOutput.includes('Weekend Anniversary Dinner'), 'TEST 4: Upcoming events reflects real future calendar events');
  assert(htmlOutput.includes('Passport_Copy.pdf uploaded') || htmlOutput.includes('Beach_Sunset.jpg uploaded'), 'TEST 4: Recent activity feed contains real uploaded file events');

  // TEST 5: Mounting & Reactivity
  DashboardModule.mount();
  assert(DashboardModule.unsubFiles !== undefined, 'TEST 5: Real-time DB listener for files registered on mount');
  assert(DashboardModule.unsubVault !== undefined, 'TEST 5: Real-time DB listener for vault registered on mount');
  DashboardModule.unmount();
  assert(true, 'TEST 5: Clean unmount executed without error');

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runDashboardTests().catch(err => {
  console.error('Dashboard Test Suite Unhandled Exception:', err);
  process.exit(1);
});
