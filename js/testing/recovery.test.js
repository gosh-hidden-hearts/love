/**
 * GOSH PHASE 10 DEVICE MANAGER & DISASTER RECOVERY TEST SUITE
 * Tests BIP-39 Mnemonic Generation, Encrypted JSON Emergency Kits,
 * SHA-256 Checksum Tamper-Evident Verification, Master Key Rotation, and Remote Device Revocation.
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
const { Recovery } = await import('../services/recovery.service.js');
const { DevicesModule } = await import('../modules/devices/devices.module.js');
const { RecoveryModule } = await import('../modules/recovery/recovery.module.js');

async function runRecoveryTests() {
  console.log('--- GOSH PHASE 10 DISASTER RECOVERY & DEVICE MANAGER TEST SUITE ---');
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
    // 0. Setup: Authenticate User 1
    localStorage.clear();
    DB.initDefaultSeed();
    const loginRes = await Auth.initiateLogin('prasanthgokul736@gmail.com', 'Gokul@709');
    await Auth.verifyOtp(loginRes.debugCode);
    assert(Auth.isAuthenticated(), 'Setup: Authenticated as User 1');

    // =========================================================================
    // 1. BIP-39 24-WORD EMERGENCY RECOVERY SEED
    // =========================================================================
    const mnemonic = Recovery.generateMnemonic(24);
    assert(typeof mnemonic === 'string', 'BIP-39: Mnemonic phrase generated as string');
    const words = mnemonic.split(' ');
    assert(words.length === 24, 'BIP-39: Mnemonic contains exactly 24 words');
    assert(Recovery.validateMnemonic(mnemonic) === true, 'BIP-39: Mnemonic passes validation against canonical dictionary');

    // Invalid mnemonic checks
    assert(Recovery.validateMnemonic('short invalid phrase') === false, 'BIP-39: Short phrase (< 12 words) rejected');
    assert(Recovery.validateMnemonic('invalidxyz '.repeat(24).trim()) === false, 'BIP-39: Non-dictionary words rejected');

    // =========================================================================
    // 2. ENCRYPTED EMERGENCY JSON KIT EXPORT
    // =========================================================================
    // Setup initial vault item
    await Vault.unlockVault('InitialPass123!');
    await Vault.addItem({
      title: 'Emergency Primary Swiss Vault',
      category: 'login',
      username: 'alex_swiss',
      password: 'SuperSecretVaultPassword999!',
      url: 'https://swissbank.ch',
      notes: 'Safe deposit box 442'
    });

    const exportBundle = await Recovery.exportEmergencyKit();
    assert(exportBundle.format === 'GOSH_ENCRYPTED_EMERGENCY_RECOVERY_KIT', 'EMERGENCY KIT: Bundle has valid format header');
    assert(exportBundle.checksum && exportBundle.checksum.length === 64, 'EMERGENCY KIT: SHA-256 checksum (64 hex chars) generated');
    assert(exportBundle.data.vault_items.length >= 1, 'EMERGENCY KIT: Encrypted vault items included in backup');
    assert(exportBundle.data.vault_items[0].data_encrypted !== 'SuperSecretVaultPassword999!', 'EMERGENCY KIT: Zero plaintext in backup JSON');

    // =========================================================================
    // 3. MASTER KEY ROTATION WORKFLOW
    // =========================================================================
    // 3a. Reject wrong current passphrase
    let wrongPassCaught = false;
    try {
      await Recovery.rotateMasterKey('WrongCurrentPass!', 'BrandNewMasterPass888!');
    } catch (err) {
      wrongPassCaught = true;
    }
    assert(wrongPassCaught, 'KEY ROTATION: Rejects rotation with incorrect current passphrase');

    // 3b. Reject new passphrase < 8 characters
    let shortPassCaught = false;
    try {
      await Recovery.rotateMasterKey('InitialPass123!', 'short');
    } catch (err) {
      shortPassCaught = true;
    }
    assert(shortPassCaught, 'KEY ROTATION: Rejects rotation if new passphrase is < 8 characters');

    // 3c. Perform valid Master Key Rotation
    const initialSalt = localStorage.getItem(Vault.saltKey);
    const rotationRes = await Recovery.rotateMasterKey('InitialPass123!', 'BrandNewMasterPass888!');
    assert(rotationRes.success === true, 'KEY ROTATION: Rotation succeeded');
    assert(rotationRes.rotatedCount >= 1, 'KEY ROTATION: Vault items re-encrypted');
    assert(rotationRes.newKeyVersion === 1 || rotationRes.newKeyVersion >= 1, 'KEY ROTATION: Key version incremented');

    const newSalt = localStorage.getItem(Vault.saltKey);
    assert(newSalt !== initialSalt, 'KEY ROTATION: Brand new random salt generated');

    // 3d. Verify vault decryption under NEW passphrase
    Vault.lockVault();
    assert(Vault.isUnlocked === false, 'KEY ROTATION: Vault locked after rotation');

    let oldPassUnlockFailed = false;
    try {
      await Vault.unlockVault('InitialPass123!');
    } catch {
      oldPassUnlockFailed = true;
    }
    assert(oldPassUnlockFailed, 'KEY ROTATION: Old master passphrase no longer unlocks vault');

    await Vault.unlockVault('BrandNewMasterPass888!');
    assert(Vault.isUnlocked === true, 'KEY ROTATION: New master passphrase successfully unlocks vault');

    const decryptedItems = await Vault.getDecryptedItems();
    const rotatedItem = decryptedItems.find(i => i.title === 'Emergency Primary Swiss Vault');
    assert(rotatedItem && rotatedItem.password === 'SuperSecretVaultPassword999!', 'KEY ROTATION: Decrypted password intact under new key');

    // =========================================================================
    // 4. DISASTER RECOVERY RESTORATION & INTEGRITY CHECKSUM
    // =========================================================================
    // 4a. Tampered file rejection
    const tamperedBundle = JSON.parse(JSON.stringify(exportBundle));
    tamperedBundle.data.vault_items.push({ id: 'fake_tampered_item' });

    let tamperCaught = false;
    try {
      await Recovery.restoreFromEmergencyKit(tamperedBundle);
    } catch (err) {
      tamperCaught = true;
      assert(err.message.includes('checksum') || err.message.includes('Integrity'), 'RESTORE: Checksum error message emitted');
    }
    assert(tamperCaught, 'RESTORE: Tampered backup file strictly rejected by SHA-256 integrity check');

    // 4b. Valid restoration
    const restoreRes = await Recovery.restoreFromEmergencyKit(exportBundle);
    assert(restoreRes.success === true, 'RESTORE: Valid emergency kit restored successfully');
    assert(restoreRes.restoredCount >= 1, 'RESTORE: Items restored to database');

    // =========================================================================
    // 5. DEVICE MANAGER & REMOTE SESSION REVOCATION
    // =========================================================================
    // Register secondary device
    Auth.registerDevice('u2-auth-0000-0000-000000000002', {
      deviceId: 'dev_test_mobile_phone_02',
      deviceName: 'Chrome on Android',
      platform: 'Android',
      deviceType: 'Mobile'
    });

    const devices = Auth.getRegisteredDevices();
    assert(devices.length >= 2, 'DEVICES: Multiple registered devices recorded');
    const mobileDevice = devices.find(d => d.deviceId === 'dev_test_mobile_phone_02');
    assert(mobileDevice && mobileDevice.revoked === false, 'DEVICES: Mobile device initially active');

    // Revoke individual device
    Auth.revokeDevice('dev_test_mobile_phone_02');
    assert(Auth.isDeviceRevoked('dev_test_mobile_phone_02') === true, 'DEVICES: Mobile device marked revoked');

    // Revoke all other devices
    Auth.revokeAllOtherDevices();
    const afterRevokeAll = Auth.getRegisteredDevices();
    const otherDevices = afterRevokeAll.filter(d => d.deviceId !== Auth.deviceId);
    assert(otherDevices.every(d => d.revoked === true), 'DEVICES: All other devices revoked');

    // =========================================================================
    // 6. MODULE VIEW RENDERING
    // =========================================================================
    const devicesHtml = DevicesModule.render();
    assert(devicesHtml.includes('GOSH Device Manager'), 'DEVICES: View renders header');
    assert(devicesHtml.includes('Revoke All Other Devices'), 'DEVICES: View provides Revoke All action');

    const recoveryHtml = await RecoveryModule.render();
    assert(recoveryHtml.includes('GOSH Recovery & Key Rotation'), 'RECOVERY: View renders header');
    assert(recoveryHtml.includes('24-Word Emergency Seed'), 'RECOVERY: View provides 24-word seed generator');
    assert(recoveryHtml.includes('Export Emergency Kit'), 'RECOVERY: View provides JSON export action');
    assert(recoveryHtml.includes('Master Key Rotation'), 'RECOVERY: View provides Key Rotation action');

    console.log(`\nPHASE 10 TESTS COMPLETED: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
    process.exit(0);

  } catch (err) {
    console.error('Test Suite Exception:', err);
    process.exit(1);
  }
}

runRecoveryTests();
