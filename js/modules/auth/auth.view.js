/**
 * GOSH INTERACTIVE AUTHENTICATION VIEW MODULE (PHASE 2)
 */

import { Icons } from '../../components/icons.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';
import { AppRouter } from '../../router.js';

export const AuthView = {
  render: () => `
    <div style="min-height: calc(100vh - 120px); display: flex; align-items: center; justify-content: center; padding: var(--space-4);">
      <div class="card" style="width: 100%; max-width: 440px; padding: var(--space-8); box-shadow: var(--shadow-lg);">
        <div class="text-center" style="margin-bottom: var(--space-6);">
          <div class="brand-emblem" style="width: 54px; height: 54px; margin: 0 auto var(--space-3); font-size: 1.5rem;">G</div>
          <h1 class="brand-title" style="font-size: var(--text-xl);">GOSH</h1>
          <p class="brand-subtitle" style="margin-top: 4px;">Your Space. Your Stories.</p>
          <div class="badge badge-champagne" style="margin-top: var(--space-3);">
            Private Digital Ecosystem
          </div>
        </div>

        <!-- Multi-Step Container -->
        <div id="auth-flow-container">
          <!-- STEP 1: Email & Password -->
          <div id="auth-step-credentials">
            <form id="auth-login-form">
              <div class="form-group">
                <label class="form-label" for="auth-email">Authorized Account Email</label>
                <input 
                  type="email" 
                  id="auth-email" 
                  class="input-field" 
                  placeholder="user1@gosh.internal" 
                  required 
                  autocomplete="email" 
                  autofocus
                />
                <span class="text-xs text-muted" style="margin-top: 2px;">
                  Pre-configured whitelist: <code>user1@gosh.internal</code> or <code>user2@gosh.internal</code>
                </span>
              </div>

              <div class="form-group">
                <div class="flex justify-between items-center">
                  <label class="form-label" for="auth-password">Password</label>
                  <button type="button" id="forgot-password-btn" class="text-xs text-muted" style="text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0;">
                    Forgot Password?
                  </button>
                </div>
                <input 
                  type="password" 
                  id="auth-password" 
                  class="input-field" 
                  placeholder="••••••••••••" 
                  required 
                  autocomplete="current-password" 
                />
              </div>

              <div class="form-group" style="margin-top: var(--space-2);">
                <label class="flex items-center gap-2 text-sm text-secondary" style="cursor: pointer;">
                  <input type="checkbox" id="auth-remember-device" checked style="accent-color: var(--accent-primary);" />
                  <span>Trust this device for 30 days</span>
                </label>
              </div>

              <div id="auth-error-msg" class="badge badge-danger w-full text-center" style="display: none; padding: 8px 12px; margin-bottom: var(--space-3); white-space: normal;"></div>

              <button type="submit" id="auth-submit-btn" class="btn btn-primary w-full" style="margin-top: var(--space-3);">
                <span>Verify Credentials & Send OTP</span>
              </button>
            </form>
          </div>

          <!-- STEP 2: Email OTP Verification (Initially Hidden) -->
          <div id="auth-step-otp" style="display: none;">
            <div class="text-center" style="margin-bottom: var(--space-4);">
              <div style="color: var(--accent-primary); margin-bottom: 8px;">
                ${Icons.recovery}
              </div>
              <h3 class="card-title" style="font-size: var(--text-md);">Enter 6-Digit Email Code</h3>
              <p class="text-xs text-muted" style="margin-top: 4px;">
                A verification code was dispatched to <strong id="otp-target-email" style="color: var(--text-primary);"></strong>
              </p>
            </div>

            <form id="auth-otp-form">
              <div class="form-group text-center">
                <input 
                  type="text" 
                  id="auth-otp-input" 
                  class="input-field text-center font-mono" 
                  placeholder="000000" 
                  maxlength="6" 
                  pattern="[0-9]{6}" 
                  style="font-size: 1.5rem; letter-spacing: 0.3em; max-width: 200px; margin: 0 auto;" 
                  required 
                  autocomplete="one-time-code"
                />
              </div>

              <div id="otp-error-msg" class="badge badge-danger w-full text-center" style="display: none; padding: 8px 12px; margin-bottom: var(--space-3); white-space: normal;"></div>

              <button type="submit" id="otp-submit-btn" class="btn btn-primary w-full" style="margin-top: var(--space-2);">
                <span>Verify & Complete Sign In</span>
              </button>

              <div class="flex justify-between items-center" style="margin-top: var(--space-4);">
                <button type="button" id="otp-back-btn" class="btn btn-ghost btn-sm">
                  ← Change Account
                </button>
                <button type="button" id="otp-resend-btn" class="btn btn-ghost btn-sm text-muted">
                  Resend Code
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="text-center" style="margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle);">
          <p class="text-xs text-muted">
            Strict 2-Account Whitelist Active • Zero-Trust Perimeter<br/>
            Public registration permanently disabled.
          </p>
        </div>
      </div>
    </div>
  `,

  mount: (container) => {
    const credsStep = container.querySelector('#auth-step-credentials');
    const otpStep = container.querySelector('#auth-step-otp');
    const loginForm = container.querySelector('#auth-login-form');
    const otpForm = container.querySelector('#auth-otp-form');
    const emailInput = container.querySelector('#auth-email');
    const passInput = container.querySelector('#auth-password');
    const rememberBox = container.querySelector('#auth-remember-device');
    const errorMsg = container.querySelector('#auth-error-msg');
    const otpErrorMsg = container.querySelector('#otp-error-msg');
    const otpInput = container.querySelector('#auth-otp-input');
    const otpTargetEmail = container.querySelector('#otp-target-email');
    const backBtn = container.querySelector('#otp-back-btn');
    const resendBtn = container.querySelector('#otp-resend-btn');
    const forgotBtn = container.querySelector('#forgot-password-btn');
    const submitBtn = container.querySelector('#auth-submit-btn');
    const otpSubmitBtn = container.querySelector('#otp-submit-btn');

    let currentEmail = '';

    // Step 1: Submit Credentials
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying...</span>';

      try {
        const email = emailInput.value.trim();
        const pass = passInput.value;
        const remember = rememberBox.checked;

        const result = await Auth.initiateLogin(email, pass, remember);
        currentEmail = email;

        // Switch to Step 2
        credsStep.style.display = 'none';
        otpStep.style.display = 'block';
        otpTargetEmail.textContent = email;
        otpInput.value = '';
        otpInput.focus();

        // Alert user of the dispatched code
        Toast.success('Verification Code Dispatched', `6-Digit OTP: ${result.debugCode} (Valid 10m)`);
      } catch (err) {
        errorMsg.textContent = err.message || 'Authentication failed.';
        errorMsg.style.display = 'block';
        Toast.error('Login Failed', err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Verify Credentials & Send OTP</span>';
      }
    });

    // Step 2: Submit OTP
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      otpErrorMsg.style.display = 'none';
      otpSubmitBtn.disabled = true;
      otpSubmitBtn.innerHTML = '<span>Validating...</span>';

      try {
        const code = otpInput.value.trim();
        await Auth.verifyOtp(code);
        Toast.success('Access Granted', `Welcome back to GOSH!`);
        AppRouter.navigate('home');
      } catch (err) {
        otpErrorMsg.textContent = err.message || 'Invalid verification code.';
        otpErrorMsg.style.display = 'block';
        Toast.error('Verification Error', err.message);
      } finally {
        otpSubmitBtn.disabled = false;
        otpSubmitBtn.innerHTML = '<span>Verify & Complete Sign In</span>';
      }
    });

    // Step 2 Back Button
    backBtn.addEventListener('click', () => {
      otpStep.style.display = 'none';
      credsStep.style.display = 'block';
      emailInput.focus();
    });

    // Step 2 Resend Code
    resendBtn.addEventListener('click', async () => {
      try {
        const result = await Auth.initiateLogin(currentEmail, passInput.value || 'goshpassword', rememberBox.checked);
        Toast.info('New OTP Sent', `Code: ${result.debugCode}`);
      } catch (err) {
        Toast.error('Resend Failed', err.message);
      }
    });

    // Forgot Password Flow
    forgotBtn.addEventListener('click', () => {
      Modal.open({
        title: 'Account Recovery & Password Reset',
        content: `
          <div class="flex flex-col gap-3">
            <p class="text-sm text-secondary">
              Enter your authorized GOSH email. A secure reset link will be dispatched through Firebase Identity.
            </p>
            <div class="form-group">
              <label class="form-label" for="reset-email">Authorized Email</label>
              <input type="email" id="reset-email" class="input-field" placeholder="user1@gosh.internal" value="${emailInput.value || ''}" />
            </div>
          </div>
        `,
        footer: `
          <div class="flex gap-2">
            <button class="btn btn-secondary" onclick="window.Modal.close(this.closest('.modal-backdrop'))">Cancel</button>
            <button class="btn btn-primary" id="confirm-reset-btn">Send Reset Link</button>
          </div>
        `,
        onOpen: (modalEl) => {
          const resetConfirmBtn = modalEl.querySelector('#confirm-reset-btn');
          const resetEmailInput = modalEl.querySelector('#reset-email');
          resetConfirmBtn.addEventListener('click', async () => {
            const target = resetEmailInput.value.trim();
            if (!target) return;
            await Auth.requestPasswordReset(target);
            Modal.close(modalEl.closest('.modal-backdrop'));
            Toast.success('Password Reset Dispatched', 'Check your authorized email address for instructions.');
          });
        }
      });
    });
  }
};
