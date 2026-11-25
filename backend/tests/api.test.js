import test from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

test('1. Health check returns online status and service diagnostics', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'online');
  assert.strictEqual(data.app, 'GOSH (Glimpse Of Soul Hearts)');
  assert.ok(data.services.firebaseAuth);
});

test('2. Unauthenticated sync-user is rejected with 401', async () => {
  const res = await fetch(`${BASE_URL}/auth/sync-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebaseUid: 'spoofed-uid',
      email: 'spoof@example.com'
    })
  });
  assert.strictEqual(res.status, 401);
});

test('3. Unauthenticated protected routes return 401', async () => {
  const endpoints = [
    '/users/search?q=alex',
    '/users/contacts',
    '/conversations',
    '/memory-vault'
  ];
  for (const ep of endpoints) {
    const res = await fetch(`${BASE_URL}${ep}`);
    assert.strictEqual(res.status, 401, `Expected 401 for ${ep}`);
  }
});
