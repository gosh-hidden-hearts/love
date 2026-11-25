import test from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

test('1. Health check returns online status and all services active', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'online');
  assert.strictEqual(data.app, 'GOSH (Glimpse Of Soul Hearts)');
  assert.strictEqual(data.services.megaCloud, 'ready');
  assert.strictEqual(data.services.googleSmtp, 'ready');
});

test('2. Agree and Continue terms acceptance records successfully', async () => {
  const res = await fetch(`${BASE_URL}/auth/terms-accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ termsVersion: '1.0.0', privacyVersion: '1.0.0' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
});

test('3. Availability check works for new username and mobile', async () => {
  const res = await fetch(`${BASE_URL}/auth/check-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'unique_soul_99', mobile: '+1999888777' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.available, true);
});

test('4. User sync and profile initialization works', async () => {
  const res = await fetch(`${BASE_URL}/auth/sync-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebaseUid: 'test-firebase-uid-123',
      email: 'alex.gosh.test@example.com',
      displayName: 'Alex Rivers',
      username: 'alexrivers',
      mobile_number: '+919876500001'
    })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.user.email, 'alex.gosh.test@example.com');
  assert.strictEqual(data.user.username, 'alexrivers');
});

test('5. Multi-identifier resolution maps username and mobile to email', async () => {
  // By username
  const resUser = await fetch(`${BASE_URL}/auth/resolve-identifier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'alexrivers' })
  });
  const dataUser = await resUser.json();
  assert.strictEqual(dataUser.success, true);
  assert.strictEqual(dataUser.email, 'alex.gosh.test@example.com');

  // By mobile number
  const resMobile = await fetch(`${BASE_URL}/auth/resolve-identifier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '+919876500001' })
  });
  const dataMobile = await resMobile.json();
  assert.strictEqual(dataMobile.success, true);
  assert.strictEqual(dataMobile.email, 'alex.gosh.test@example.com');
});

test('6. Contact discovery search finds registered users', async () => {
  const res = await fetch(`${BASE_URL}/users/search?q=alexrivers`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.users.length > 0);
  assert.strictEqual(data.users[0].username, 'alexrivers');
});

test('7. Memory Vault returns memories list', async () => {
  const res = await fetch(`${BASE_URL}/memory-vault`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.memories));
});

test('8. Call logging and history retrieval works', async () => {
  const logRes = await fetch(`${BASE_URL}/calls/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callerId: 'test-user-1',
      receiverId: 'test-user-2',
      callType: 'video',
      callStatus: 'ended',
      durationSeconds: 120
    })
  });
  assert.strictEqual(logRes.status, 200);

  const histRes = await fetch(`${BASE_URL}/calls/history?userId=test-user-1`);
  assert.strictEqual(histRes.status, 200);
  const histData = await histRes.json();
  assert.strictEqual(histData.success, true);
  assert.ok(histData.calls.length > 0);
});

test('9. MEGA file storage status endpoint responds', async () => {
  const res = await fetch(`${BASE_URL}/files/status`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.connected, true);
  assert.strictEqual(data.rootNodeId, 'pmRVmLJC');
});

test('10. Attachment upload streams directly to MEGA Cloud Storage', async () => {
  const formData = new FormData();
  const fileBlob = new Blob(['Test Attachment from GOSH Unit Test 💌'], { type: 'text/plain' });
  formData.append('file', fileBlob, 'test_attachment.txt');

  const res = await fetch(`${BASE_URL}/messages/upload`, {
    method: 'POST',
    body: formData
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.fileUrl);
  assert.ok(data.fileUrl.startsWith('/api/files/stream/'));
  assert.ok(data.megaFileHandle);
  assert.strictEqual(data.messageType, 'file');
  console.log('Uploaded attachment to MEGA successfully! Stream URL:', data.fileUrl, 'Node ID:', data.megaFileHandle);
});
