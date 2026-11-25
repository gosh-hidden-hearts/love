import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, '../src/server.js');

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch (e) {
      // not yet up
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function run() {
  console.log('🚀 Launching backend server for end-to-end testing...');
  const serverProc = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '5000', NODE_ENV: 'development' }
  });

  const ready = await waitForServer('http://localhost:5000/api/health');
  if (!ready) {
    console.error('❌ Server did not start within timeout.');
    serverProc.kill();
    process.exit(1);
  }

  console.log('✅ Server is online! Running test suite...');

  const testProc = spawn('node', ['--test', 'backend/tests/api.test.js', 'backend/tests/otp.test.js'], {
    stdio: 'inherit'
  });

  testProc.on('exit', (code) => {
    console.log(`\n🏁 Test suite exited with code: ${code}`);
    serverProc.kill();
    process.exit(code || 0);
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
