/**
 * GOSH PHASE 6 MEGA CLOUD STORAGE TEST SUITE
 * Tests folder hierarchy, file upload progress, metadata persistence, renaming, deletion, and quota.
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

// Mock FileReader for Node.js
global.FileReader = class {
  readAsDataURL(blob) {
    setTimeout(() => {
      this.result = 'data:application/octet-stream;base64,TU9DS19GSUxFX1BBWUxPQUQ=';
      if (this.onload) this.onload();
    }, 10);
  }
};

try {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: 'NodeTest/1.0 (Windows NT 10.0)',
    configurable: true
  });
} catch {}

// Import dependencies
const { Auth } = await import('../services/auth.service.js');
const { DB } = await import('../services/db.service.js');
const { Mega } = await import('../services/mega.service.js');
const { CloudModule } = await import('../modules/cloud/cloud.module.js');

async function runCloudTests() {
  console.log('--- GOSH PHASE 6 MEGA CLOUD STORAGE TEST SUITE ---');
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

  // Setup: Authenticate as User 1
  const loginResult = await Auth.initiateLogin('user1@gosh.internal', 'securepassword123');
  await Auth.verifyOtp(loginResult.debugCode);
  assert(Auth.isAuthenticated(), 'Setup: Authenticated as User 1');

  // TEST 1: Initial Quota Telemetry
  const initialQuota = await Mega.getQuota();
  assert(initialQuota.totalBytes === 21474836480, 'TEST 1: Total quota is 20 GB (21,474,836,480 bytes)');
  assert(typeof initialQuota.usedBytes === 'number', 'TEST 1: usedBytes numeric representation returned');

  // TEST 2: Folder Creation
  const newFolder = await Mega.createFolder('Travel Itineraries', null, '#38bdf8');
  assert(newFolder && newFolder.id, 'TEST 2: Folder created with unique ID');
  assert(newFolder.name === 'Travel Itineraries', 'TEST 2: Folder name matches input');

  // TEST 3: Folder Rename
  const renamedFolder = await Mega.renameFolder(newFolder.id, '2026 Travel Itineraries');
  assert(renamedFolder.name === '2026 Travel Itineraries', 'TEST 3: Folder renamed successfully');

  // TEST 4: File Upload with Progress Tracking
  const mockFile = {
    name: 'Flight_Confirmation.pdf',
    size: 1048576, // 1 MB
    type: 'application/pdf'
  };

  const progressUpdates = [];
  const uploadedFile = await Mega.uploadFile(mockFile, newFolder.id, 'document', (pct) => {
    progressUpdates.push(pct);
  });

  assert(uploadedFile && uploadedFile.id, 'TEST 4: File uploaded and saved to files table');
  assert(uploadedFile.mega_handle.startsWith('mega_node_'), 'TEST 4: Dedicated MEGA node handle generated');
  assert(uploadedFile.folder_id === newFolder.id, 'TEST 4: File linked to parent folder');
  assert(progressUpdates.includes(100), 'TEST 4: Upload progress reached 100%');

  // TEST 5: Storage Quota Reflects Uploaded File
  const updatedQuota = await Mega.getQuota();
  assert(updatedQuota.usedBytes >= 1048576, 'TEST 5: Storage quota updated to reflect uploaded 1 MB');

  // TEST 6: File Rename
  const renamedFile = await Mega.renameFile(uploadedFile.id, 'Flight_Confirmation_Final.pdf');
  assert(renamedFile.name === 'Flight_Confirmation_Final.pdf', 'TEST 6: File renamed successfully');

  // TEST 7: File Deletion & Quota Reclaim
  await Mega.deleteFile(uploadedFile.id);
  const checkFile = await DB.getById('files', uploadedFile.id);
  assert(checkFile === null, 'TEST 7: File permanently deleted from database');

  const reclaimedQuota = await Mega.getQuota();
  assert(reclaimedQuota.usedBytes < updatedQuota.usedBytes, 'TEST 7: Storage quota reclaimed after file deletion');

  // TEST 8: Folder Deletion
  await Mega.deleteFolder(newFolder.id);
  const checkFolder = await DB.getById('folders', newFolder.id);
  assert(checkFolder === null, 'TEST 8: Folder removed from database');

  // TEST 9: Byte Formatting Utility
  assert(CloudModule.formatBytes(104857600) === '100 MB', 'TEST 9: Format 100 MB string properly');

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runCloudTests().catch(err => {
  console.error('Cloud Test Suite Unhandled Exception:', err);
  process.exit(1);
});
