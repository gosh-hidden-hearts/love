import test from 'node:test';
import assert from 'node:assert';
import otpService from '../src/services/otpService.js';

test('Google SMTP OTP generation, dispatch, and verification end-to-end', async () => {
  const testEmail = 'gosh81416@gmail.com'; // Send directly to the verified project email!

  console.log('Sending test OTP to', testEmail);
  const sendRes = await otpService.sendOtpEmail(testEmail, 'signup');
  assert.strictEqual(sendRes.success, true);
  assert.ok(sendRes.messageId);

  // Check verification with wrong OTP
  const failVerify = await otpService.verifyOtp(testEmail, '000000', 'signup');
  assert.strictEqual(failVerify.success, false);
});
