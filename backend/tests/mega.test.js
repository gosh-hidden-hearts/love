import test from 'node:test';
import assert from 'node:assert';
import megaStorageService from '../src/services/megaStorageService.js';

test('MEGA Cloud Storage real upload and handle retrieval', async () => {
  const dummyBuffer = Buffer.from('GOSH Love Note — A private moment in the cloud 💖', 'utf8');
  const fileName = `test_love_note_${Date.now()}.txt`;

  console.log('Uploading test buffer to MEGA Cloud...');
  const res = await megaStorageService.uploadFile(dummyBuffer, fileName, 'text/plain');
  assert.strictEqual(res.success, true);
  assert.ok(res.nodeId);
  assert.strictEqual(res.fileName, fileName);
  console.log('Uploaded Node ID:', res.nodeId);
  console.log('Download URL / Handle:', res.downloadUrl);
});
