import test from 'node:test';
import assert from 'node:assert';
import megaStorageService from '../src/services/megaStorageService.js';

test('1. MEGA Cloud Storage connection and status check', async () => {
  const status = await megaStorageService.getStatus();
  console.log('MEGA Status:', status);
  assert.strictEqual(status.connected, true);
  assert.ok(status.email);
  assert.strictEqual(status.rootNodeId, 'pmRVmLJC');
});

test('2. Upload Memory file to GOSH_Memories folder', async () => {
  const dummyBuffer = Buffer.from('GOSH Love Note — A private moment in the cloud 💖', 'utf8');
  const fileName = `test_memory_${Date.now()}.txt`;

  console.log('Uploading test memory to MEGA Cloud...');
  const res = await megaStorageService.uploadFile(dummyBuffer, fileName, 'text/plain', 'GOSH_Memories');
  assert.strictEqual(res.success, true);
  assert.ok(res.nodeId);
  assert.strictEqual(res.fileName, fileName);
  assert.ok(res.streamUrl);
  assert.ok(res.publicUrl);
  console.log('Memory Node ID:', res.nodeId, 'Stream URL:', res.streamUrl, 'Public Link:', res.publicUrl);
});

test('3. Upload Chat attachment to GOSH_Chat_Attachments folder & verify stream', async () => {
  const dummyBuffer = Buffer.from('GOSH Secret Chat Attachment Document 💌', 'utf8');
  const fileName = `test_chat_doc_${Date.now()}.txt`;

  console.log('Uploading chat attachment to GOSH_Chat_Attachments...');
  const res = await megaStorageService.uploadFile(dummyBuffer, fileName, 'text/plain', 'GOSH_Chat_Attachments');
  assert.strictEqual(res.success, true);
  assert.ok(res.nodeId);

  // Verify file retrieval and stream
  const file = await megaStorageService.getFile(res.nodeId);
  assert.ok(file);
  assert.strictEqual(file.name, fileName);

  const stream = await megaStorageService.downloadStream(res.nodeId);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const downloadedText = Buffer.concat(chunks).toString('utf8');
  assert.strictEqual(downloadedText, 'GOSH Secret Chat Attachment Document 💌');
  console.log('Chat attachment verified successfully! Content:', downloadedText);
});
