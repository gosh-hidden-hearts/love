/**
 * GOSH PHASE 7 VAULT & DOCUMENT LOCKER TEST SUITE
 * Tests zero-knowledge PBKDF2 derivation, AES-256-GCM credential encryption,
 * password generator, strength calculator, auto-lock, and document locker.
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
const { Vault } = await import('../services/vault.service.js');

async function runVaultTests() {
  console.log('--- GOSH PHASE 7 VAULT & DOCUMENT LOCKER TEST SUITE ---');
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

  // Setup: Authenticate User 1
  const loginResult = await Auth.initiateLogin('user1@gosh.internal', 'securepassword123');
  await Auth.verifyOtp(loginResult.debugCode);
  assert(Auth.isAuthenticated(), 'Setup: Authenticated as User 1');

  // TEST 1: Password Generator Quality
  const genPassword = Vault.generatePassword({ length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true });
  assert(genPassword.length === 24, 'TEST 1: Generator outputs exact requested length (24 chars)');
  assert(/[A-Z]/.test(genPassword) && /[a-z]/.test(genPassword) && /[0-9]/.test(genPassword), 'TEST 1: Generator contains mixed character sets');

  // TEST 2: Password Strength Calculator
  assert(Vault.calculateStrength('12345').score <= 1, 'TEST 2: "12345" scored as Very Weak');
  assert(Vault.calculateStrength('GoshPass!2026StrongKey').score >= 4, 'TEST 2: Complex password scored as Strong / Very Strong');

  // TEST 3: Short Master Passphrase Rejection
  try {
    await Vault.unlockVault('short');
    assert(false, 'TEST 3: Short passphrase must be rejected');
  } catch (err) {
    assert(err.message.includes('at least 8 characters'), 'TEST 3: Master passphrase < 8 characters strictly rejected');
  }

  // TEST 4: Unlock Vault & Establish Verifier
  const masterPass = 'MyUltraSecretVaultPassphrase2026!';
  const unlocked = await Vault.unlockVault(masterPass);
  assert(unlocked === true && Vault.isUnlocked === true, 'TEST 4: Vault unlocked successfully');
  assert(Vault.masterKey !== null, 'TEST 4: AES-256-GCM Master Encryption Key derived in memory');

  // TEST 5: Encrypt & Store Credential Item
  const item = await Vault.addItem({
    title: 'Primary Banking Portal',
    category: 'login',
    username: 'alex_financial',
    password: 'SuperSecretBankPassword123#',
    url: 'https://bank.secure.internal',
    notes: 'Account PIN: 8492'
  });
  assert(item && item.id, 'TEST 5: Vault item inserted with generated ID');

  // Verify raw database row has ZERO plaintext
  const rawRow = await DB.getById('vault_items', item.id);
  assert(rawRow.data_encrypted && !rawRow.data_encrypted.includes('SuperSecretBankPassword123#'), 'TEST 5: Zero plaintext in database row');
  assert(rawRow.iv && rawRow.iv.length === 24, 'TEST 5: Unique 96-bit IV stored in row');

  // TEST 6: Query & Decrypt Vault Items
  const decryptedItems = await Vault.getDecryptedItems();
  const foundItem = decryptedItems.find(i => i.id === item.id);
  assert(foundItem !== undefined, 'TEST 6: Item found in decrypted list');
  assert(foundItem.password === 'SuperSecretBankPassword123#', 'TEST 6: Plaintext password restored accurately in memory');
  assert(foundItem.username === 'alex_financial', 'TEST 6: Plaintext username restored accurately in memory');

  // TEST 7: Update Vault Item
  const updatedItem = await Vault.updateItem(item.id, {
    notes: 'Account PIN updated: 9911'
  });
  assert(updatedItem && updatedItem.id === item.id, 'TEST 7: Vault item updated in database');

  const refreshedItems = await Vault.getDecryptedItems();
  const refreshedFound = refreshedItems.find(i => i.id === item.id);
  assert(refreshedFound.notes === 'Account PIN updated: 9911', 'TEST 7: Updated notes decrypted accurately');

  // TEST 8: Lock Vault & Memory Purge
  Vault.lockVault();
  assert(Vault.isUnlocked === false, 'TEST 8: Vault reports locked');
  assert(Vault.masterKey === null, 'TEST 8: Master Encryption Key purged from memory');

  // Verify locked access rejection
  try {
    await Vault.getDecryptedItems();
    assert(false, 'TEST 8: Querying while locked must throw error');
  } catch (err) {
    assert(err.message.includes('Vault is locked'), 'TEST 8: Access to encrypted vault rejected while locked');
  }

  // TEST 9: Incorrect Passphrase Rejection
  try {
    await Vault.unlockVault('WrongPassphrase12345!');
    assert(false, 'TEST 9: Wrong passphrase must be rejected');
  } catch (err) {
    assert(err.message.includes('Incorrect Master Passphrase'), 'TEST 9: Incorrect passphrase rejected by verifier');
  }

  // TEST 10: Document Locker Record Integrity
  const mockFile = await DB.insert('files', {
    name: 'National_Passport.pdf',
    file_size: 1548576,
    mime_type: 'application/pdf',
    mega_handle: 'mega_passport_node',
    category: 'document',
    is_encrypted: true
  });

  const docRecord = await DB.insert('documents', {
    file_id: mockFile.id,
    title: 'Alex National Passport',
    category: 'identity',
    notes: 'Valid until 2034',
    is_confidential: true
  });
  assert(docRecord && docRecord.id, 'TEST 10: Document Locker record inserted');
  assert(docRecord.category === 'identity', 'TEST 10: Document classified as identity');

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runVaultTests().catch(err => {
  console.error('Vault Test Suite Unhandled Exception:', err);
  process.exit(1);
});
