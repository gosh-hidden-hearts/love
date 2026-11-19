/**
 * GOSH PHASE 3 DATABASE & RLS TEST SUITE
 * Tests schema operations, seed integrity, authorization gate, and reactive subscriptions.
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

// Import services
const { Auth } = await import('../services/auth.service.js');
const { DB } = await import('../services/db.service.js');

async function runDatabaseTests() {
  console.log('--- GOSH PHASE 3 DATABASE & RLS TEST SUITE ---');
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

  // TEST 1: Unauthenticated Query Rejection (Security Gate)
  Auth.logout();
  try {
    await DB.query('conversations');
    assert(false, 'TEST 1: Unauthenticated query must throw Access Denied');
  } catch (err) {
    assert(err.message.includes('Access Denied'), 'TEST 1: Unauthenticated query strictly rejected by RLS Gate');
  }

  // Authenticate as User 1
  const loginResult = await Auth.initiateLogin('user1@gosh.internal', 'securepassword123');
  await Auth.verifyOtp(loginResult.debugCode);
  assert(Auth.isAuthenticated(), 'Setup: Successfully authenticated as User 1');

  // TEST 2: Seed Data Verification
  const conversations = await DB.query('conversations');
  assert(conversations.length > 0, 'TEST 2: Seed conversations loaded successfully');
  assert(conversations[0].title === 'GOSH Secure Room', 'TEST 2: Initial conversation room is GOSH Secure Room');

  const folders = await DB.query('folders');
  assert(folders.length >= 3, 'TEST 2: Default cloud folders (Documents, Photos, Backups) exist');

  const playlists = await DB.query('music_playlists');
  assert(playlists.length >= 2, 'TEST 2: Default music playlists initialized');

  // TEST 3: CRUD Insert Operation
  const taskRecord = await DB.insert('shared_tasks', {
    title: 'Plan Summer Trip',
    description: 'Finalize dates and book tickets',
    priority: 'high',
    completed: false
  });
  assert(taskRecord && taskRecord.id, 'TEST 3: Record inserted with generated ID');
  assert(taskRecord.created_by === 'u1-auth-0000-0000-000000000001', 'TEST 3: Record tagged with creator User 1 ID');

  // TEST 4: CRUD Query & Filter Operation
  const retrievedTasks = await DB.query('shared_tasks', t => t.priority === 'high');
  assert(retrievedTasks.length === 1 && retrievedTasks[0].title === 'Plan Summer Trip', 'TEST 4: Record queried with filter condition');

  const singleTask = await DB.getById('shared_tasks', taskRecord.id);
  assert(singleTask && singleTask.id === taskRecord.id, 'TEST 4: getById retrieves exact record');

  // TEST 5: Realtime Subscription & Update Operation
  let realtimeFired = false;
  const unsubscribe = DB.subscribe('shared_tasks', (updatedRows) => {
    realtimeFired = true;
  });

  const updatedTask = await DB.update('shared_tasks', taskRecord.id, {
    completed: true
  });
  assert(updatedTask.completed === true, 'TEST 5: Record updated successfully');
  assert(updatedTask.updated_at !== undefined, 'TEST 5: Record updated_at timestamp generated');
  assert(realtimeFired, 'TEST 5: Realtime subscription listener triggered on update');
  unsubscribe();

  // TEST 6: CRUD Delete Operation
  const deleteResult = await DB.delete('shared_tasks', taskRecord.id);
  assert(deleteResult.success === true, 'TEST 6: Record deleted successfully');

  const afterDelete = await DB.getById('shared_tasks', taskRecord.id);
  assert(afterDelete === null, 'TEST 6: Deleted record no longer exists in database');

  // TEST 7: Invalid ID Error Handling
  try {
    await DB.update('shared_tasks', 'non-existent-id', { title: 'Test' });
    assert(false, 'TEST 7: Non-existent ID update must throw error');
  } catch (err) {
    assert(err.message.includes('not found'), 'TEST 7: Update with non-existent ID handled safely');
  }

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runDatabaseTests().catch(err => {
  console.error('Database Test Suite Unhandled Exception:', err);
  process.exit(1);
});
