/**
 * GOSH INTERACTIVE AUTHENTICATION & PUBLIC REGISTRATION VIEW
 * Mobile-First Romantic Social Messaging Application
 */

import { Icons } from '../../components/icons.js';
import { Auth } from '../../services/auth.service.js';
import { Toast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';
import { AppRouter } from '../../router.js';

export const AuthView = {
  render: () => `
    <div class="auth-page-wrapper" style="min-height: calc(100vh - 100px); display: flex; align-items: center; justify-content: center; padding: var(--space-4);">
      <div class="auth-card card" style="width: 100%; max-width: 460px; padding: var(--space-6) var(--space-6); box-shadow: var(--shadow-lg); border: 1px solid var(--border-subtle); background: var(--bg-surface); backdrop-filter: blur(16px); border-radius: var(--radius-xl);">
        
        <!-- Romantic Emblem & Brand Header -->
        <div class="text-center" style="margin-bottom: var(--space-5);">
          <div class="brand-emblem love-glow" style="width: 58px; height: 58px; margin: 0 auto var(--space-2); font-size: 1.6rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, var(--wine-700), var(--wine-500)); color: var(--ivory-50); box-shadow: 0 4px 18px rgba(139, 38, 75, 0.45); border: 1.5px solid var(--rose-400);">G</div>
          <h1 class="brand-title" style="font-size: 1.6rem; font-weight: 700; letter-spacing: 0.04em; color: var(--ivory-50); margin: 0;">GOSH</h1>
          <p class="brand-subtitle" style="margin-top: 4px; font-size: 0.85rem; color: var(--rose-300); letter-spacing: 0.05em;">Your Space. Your Stories.</p>
        </div>

        <!-- Auth Navigation Tabs (Sign In / Create Account) -->
        <div id="auth-tab-bar" class="flex rounded-lg" style="background: var(--bg-elevated); padding: 4px; margin-bottom: var(--space-5); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
          <button type="button" id="tab-login-btn" class="btn btn-sm flex-1" style="background: var(--wine-600); color: var(--ivory-50); border: none; font-weight: 600; border-radius: var(--radius-sm); transition: all 0.2s ease;">
            Sign In
          </button>
          <button type="button" id="tab-register-btn" class="btn btn-sm flex-1" style="background: transparent; color: var(--text-secondary); border: none; font-weight: 500; border-radius: var(--radius-sm); transition: all 0.2s ease;">
            Create Account
          </button>
        </div>

        <!-- Container for Multi-Step Flows -->
        <div id="auth-flow-container">
          
          <!-- TAB 1: LOGIN FORM -->
          <div id="auth-step-login">
            <form id="auth-login-form">
              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label" for="auth-login-identifier" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Email, Mobile, or Username</label>
                <input 
                  type="text" 
                  id="auth-login-identifier" 
                  class="input-field" 
                  placeholder="name@example.com or @username" 
                  required 
                  autocomplete="username" 
                  autofocus
                  style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                />
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <div class="flex justify-between items-center" style="margin-bottom: 4px;">
                  <label class="form-label" for="auth-login-password" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Password</label>
                  <button type="button" id="forgot-password-btn" class="text-xs" style="color: var(--rose-400); text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0;">
                    Forgot Password?
                  </button>
                </div>
                <input 
                  type="password" 
                  id="auth-login-password" 
                  class="input-field" 
                  placeholder="••••••••••••" 
                  required 
                  autocomplete="current-password" 
                  style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                />
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="flex items-center gap-2 text-sm" style="cursor: pointer; color: var(--text-secondary);">
                  <input type="checkbox" id="auth-remember-device" checked style="accent-color: var(--accent-primary);" />
                  <span>Trust this device for 30 days</span>
                </label>
              </div>

              <div id="login-error-msg" class="badge badge-danger w-full text-center" style="display: none; padding: 8px 12px; margin-bottom: var(--space-3); white-space: normal;"></div>

              <button type="submit" id="login-submit-btn" class="btn btn-primary w-full" style="padding: 12px; font-weight: 600; background: linear-gradient(135deg, var(--wine-600), var(--wine-500)); border: 1px solid var(--rose-400);">
                <span>Sign In with Verification</span>
              </button>
            </form>
          </div>

          <!-- TAB 2: PUBLIC REGISTRATION FORM -->
          <div id="auth-step-register" style="display: none;">
            <form id="auth-register-form">
              <div class="form-group" style="margin-bottom: var(--space-3);">
                <label class="form-label" for="reg-fullname" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Full Name</label>
                <input 
                  type="text" 
                  id="reg-fullname" 
                  class="input-field" 
                  placeholder="e.g. Elena Rostova" 
                  required 
                  autocomplete="name" 
                  style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                />
              </div>

              <div class="form-group" style="margin-bottom: var(--space-3);">
                <label class="form-label" for="reg-username" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Unique Username</label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--rose-400); font-weight: 600;">@</span>
                  <input 
                    type="text" 
                    id="reg-username" 
                    class="input-field" 
                    placeholder="username" 
                    required 
                    autocomplete="username" 
                    style="padding-left: 28px; border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                  />
                </div>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-3);">
                <label class="form-label" for="reg-email" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Email Address (For Verification)</label>
                <input 
                  type="email" 
                  id="reg-email" 
                  class="input-field" 
                  placeholder="name@example.com" 
                  required 
                  autocomplete="email" 
                  style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                />
              </div>

              <div class="form-group" style="margin-bottom: var(--space-3);">
                <label class="form-label" for="reg-phone" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Mobile Phone Number</label>
                <input 
                  type="tel" 
                  id="reg-phone" 
                  class="input-field" 
                  placeholder="+1 555-0199" 
                  required 
                  autocomplete="tel" 
                  style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                />
              </div>

              <div class="grid grid-2" style="gap: var(--space-2); margin-bottom: var(--space-3);">
                <div class="form-group">
                  <label class="form-label" for="reg-password" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Password</label>
                  <input 
                    type="password" 
                    id="reg-password" 
                    class="input-field" 
                    placeholder="Min 8 chars" 
                    required 
                    minlength="8" 
                    autocomplete="new-password" 
                    style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="reg-confirm-password" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Confirm</label>
                  <input 
                    type="password" 
                    id="reg-confirm-password" 
                    class="input-field" 
                    placeholder="Repeat" 
                    required 
                    minlength="8" 
                    autocomplete="new-password" 
                    style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                  />
                </div>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label" for="reg-bio" style="font-size: 0.82rem; color: var(--rose-200); font-weight: 500;">Short Bio (Optional)</label>
                <input 
                  type="text" 
                  id="reg-bio" 
                  class="input-field" 
                  placeholder="Living life, telling stories." 
                  maxlength="150" 
                  style="border-color: var(--border-subtle); background: var(--bg-primary); color: var(--text-primary);"
                />
              </div>

              <div id="reg-error-msg" class="badge badge-danger w-full text-center" style="display: none; padding: 8px 12px; margin-bottom: var(--space-3); white-space: normal;"></div>

              <button type="submit" id="reg-submit-btn" class="btn btn-primary w-full" style="padding: 12px; font-weight: 600; background: linear-gradient(135deg, var(--wine-600), var(--wine-500)); border: 1px solid var(--rose-400);">
                <span>Create Account & Verify OTP</span>
              </button>
            </form>
          </div>

          <!-- STEP: 6-DIGIT EMAIL OTP VERIFICATION (Shown after login or register) -->
          <div id="auth-step-otp" style="display: none;">
            <div class="text-center" style="margin-bottom: var(--space-4);">
              <div style="color: var(--rose-300); margin-bottom: 8px;">
                ${Icons.recovery}
              </div>
              <h3 class="card-title" style="font-size: 1.15rem; color: var(--ivory-50);">Enter 6-Digit Verification Code</h3>
              <p class="text-xs" style="margin-top: 6px; color: var(--rose-200);">
                A one-time security code was sent to <strong id="otp-target-email" style="color: var(--champagne-300); font-weight: 600;"></strong>
              </p>
            </div>

            <form id="auth-otp-form">
              <div class="form-group text-center" style="margin-bottom: var(--space-4);">
                <input 
                  type="text" 
                  id="auth-otp-input" 
                  class="input-field text-center font-mono" 
                  placeholder="000000" 
                  maxlength="6" 
                  pattern="[0-9]{6}" 
                  style="font-size: 1.75rem; letter-spacing: 0.35em; max-width: 220px; margin: 0 auto; border-color: var(--rose-400); background: var(--bg-primary); color: var(--champagne-200); font-weight: 700;" 
                  required 
                  autocomplete="one-time-code"
                />
                <div class="text-xs text-muted" id="otp-timer-label" style="margin-top: 8px;">Code expires in <span id="otp-countdown">10:00</span></div>
              </div>

              <div id="otp-error-msg" class="badge badge-danger w-full text-center" style="display: none; padding: 8px 12px; margin-bottom: var(--space-3); white-space: normal;"></div>

              <button type="submit" id="otp-submit-btn" class="btn btn-primary w-full" style="padding: 12px; font-weight: 600; background: linear-gradient(135deg, var(--wine-600), var(--wine-500)); border: 1px solid var(--rose-400);">
                <span>Verify & Complete Sign In</span>
              </button>

              <div class="flex justify-between items-center" style="margin-top: var(--space-4);">
                <button type="button" id="otp-back-btn" class="btn btn-ghost btn-sm" style="color: var(--rose-300);">
                  ← Back
                </button>
                <button type="button" id="otp-resend-btn" class="btn btn-ghost btn-sm" style="color: var(--champagne-300);">
                  Resend Code
                </button>
              </div>
            </form>
          </div>

        </div>

        <!-- Privacy & End-to-End Encryption Note -->
        <div class="text-center" style="margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle);">
          <p class="text-xs" style="color: var(--rose-300); opacity: 0.85; margin: 0;">
            End-to-End Encrypted Social Messaging • Private Cloud
          </p>
        </div>

      </div>
    </div>
  `,

  mount: (container) => {
    // Navigation Tabs
    const tabLoginBtn = container.querySelector('#tab-login-btn');
    const tabRegisterBtn = container.querySelector('#tab-register-btn');
    const stepLogin = container.querySelector('#auth-step-login');
    const stepRegister = container.querySelector('#auth-step-register');
    const stepOtp = container.querySelector('#auth-step-otp');
    const tabBar = container.querySelector('#auth-tab-bar');

    // Forms
    const loginForm = container.querySelector('#auth-login-form');
    const registerForm = container.querySelector('#auth-register-form');
    const otpForm = container.querySelector('#auth-otp-form');

    // Inputs
    const loginIdentifier = container.querySelector('#auth-login-identifier');
    const loginPassword = container.querySelector('#auth-login-password');
    const rememberDevice = container.querySelector('#auth-remember-device');
    const loginError = container.querySelector('#login-error-msg');
    const loginSubmitBtn = container.querySelector('#login-submit-btn');

    // Registration inputs
    const regFullName = container.querySelector('#reg-fullname');
    const regUsername = container.querySelector('#reg-username');
    const regEmail = container.querySelector('#reg-email');
    const regPhone = container.querySelector('#reg-phone');
    const regPassword = container.querySelector('#reg-password');
    const regConfirmPass = container.querySelector('#reg-confirm-password');
    const regBio = container.querySelector('#reg-bio');
    const regError = container.querySelector('#reg-error-msg');
    const regSubmitBtn = container.querySelector('#reg-submit-btn');

    // OTP elements
    const otpInput = container.querySelector('#auth-otp-input');
    const otpErrorMsg = container.querySelector('#otp-error-msg');
    const otpTargetEmail = container.querySelector('#otp-target-email');
    const otpSubmitBtn = container.querySelector('#otp-submit-btn');
    const otpBackBtn = container.querySelector('#otp-back-btn');
    const otpResendBtn = container.querySelector('#otp-resend-btn');
    const forgotBtn = container.querySelector('#forgot-password-btn');

    let currentEmail = '';
    let currentFlow = 'login'; // 'login' or 'register'

    // Tab switching logic
    function setTab(tab) {
      currentFlow = tab;
      if (tab === 'login') {
        tabLoginBtn.style.background = 'var(--wine-600)';
        tabLoginBtn.style.color = 'var(--ivory-50)';
        tabLoginBtn.style.fontWeight = '600';
        tabRegisterBtn.style.background = 'transparent';
        tabRegisterBtn.style.color = 'var(--text-secondary)';
        tabRegisterBtn.style.fontWeight = '500';

        stepLogin.style.display = 'block';
        stepRegister.style.display = 'none';
        stepOtp.style.display = 'none';
        tabBar.style.display = 'flex';
        loginIdentifier.focus();
      } else {
        tabRegisterBtn.style.background = 'var(--wine-600)';
        tabRegisterBtn.style.color = 'var(--ivory-50)';
        tabRegisterBtn.style.fontWeight = '600';
        tabLoginBtn.style.background = 'transparent';
        tabLoginBtn.style.color = 'var(--text-secondary)';
        tabLoginBtn.style.fontWeight = '500';

        stepRegister.style.display = 'block';
        stepLogin.style.display = 'none';
        stepOtp.style.display = 'none';
        tabBar.style.display = 'flex';
        regFullName.focus();
      }
    }

    tabLoginBtn.addEventListener('click', () => setTab('login'));
    tabRegisterBtn.addEventListener('click', () => setTab('register'));

    // Step 1A: Submit Login Credentials
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.innerHTML = '<span>Verifying...</span>';

      try {
        const idVal = loginIdentifier.value.trim();
        const passVal = loginPassword.value;
        const remember = rememberBox ? rememberDevice.checked : true;

        const result = await Auth.initiateLogin(idVal, passVal, remember);
        currentEmail = result.email;

        // Transition to OTP Screen
        tabBar.style.display = 'none';
        stepLogin.style.display = 'none';
        stepRegister.style.display = 'none';
        stepOtp.style.display = 'block';
        otpTargetEmail.textContent = currentEmail;
        otpInput.value = '';
        otpInput.focus();

        Toast.success('Security Code Dispatched', `Verification code sent to ${currentEmail}`);
        if (result.debugCode) {
          console.log(`[GOSH DEBUG OTP] Code: ${result.debugCode}`);
        }
      } catch (err) {
        loginError.textContent = err.message || 'Login failed. Please check credentials.';
        loginError.style.display = 'block';
        Toast.error('Login Error', err.message);
      } finally {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.innerHTML = '<span>Sign In with Verification</span>';
      }
    });

    // Step 1B: Submit Public Registration
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      regError.style.display = 'none';
      regSubmitBtn.disabled = true;
      regSubmitBtn.innerHTML = '<span>Creating Account...</span>';

      try {
        const payload = {
          fullName: regFullName.value.trim(),
          username: regUsername.value.trim(),
          email: regEmail.value.trim(),
          phone: regPhone.value.trim(),
          password: regPassword.value,
          confirmPassword: regConfirmPass.value,
          bio: regBio.value.trim()
        };

        const result = await Auth.register(payload);
        currentEmail = result.email;

        // Transition to OTP Screen
        tabBar.style.display = 'none';
        stepRegister.style.display = 'none';
        stepLogin.style.display = 'none';
        stepOtp.style.display = 'block';
        otpTargetEmail.textContent = currentEmail;
        otpInput.value = '';
        otpInput.focus();

        Toast.success('Account Created', `Please verify with the 6-digit code sent to ${currentEmail}`);
        if (result.debugCode) {
          console.log(`[GOSH REGISTRATION OTP] Code: ${result.debugCode}`);
        }
      } catch (err) {
        regError.textContent = err.message || 'Registration failed.';
        regError.style.display = 'block';
        Toast.error('Registration Error', err.message);
      } finally {
        regSubmitBtn.disabled = false;
        regSubmitBtn.innerHTML = '<span>Create Account & Verify OTP</span>';
      }
    });

    // Step 2: Submit OTP Verification
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      otpErrorMsg.style.display = 'none';
      otpSubmitBtn.disabled = true;
      otpSubmitBtn.innerHTML = '<span>Validating...</span>';

      try {
        const code = otpInput.value.trim();
        await Auth.verifyOtp(code);
        Toast.success('Access Granted', 'Welcome to GOSH!');
        AppRouter.navigate('home');
      } catch (err) {
        otpErrorMsg.textContent = err.message || 'Invalid 6-digit code.';
        otpErrorMsg.style.display = 'block';
        Toast.error('Verification Error', err.message);
      } finally {
        otpSubmitBtn.disabled = false;
        otpSubmitBtn.innerHTML = '<span>Verify & Complete Sign In</span>';
      }
    });

    // Step 2 Back Button
    otpBackBtn.addEventListener('click', () => {
      setTab(currentFlow);
    });

    // Step 2 Resend Code
    otpResendBtn.addEventListener('click', async () => {
      try {
        const result = await Auth.initiateLogin(currentEmail, loginPassword.value || 'Gokul@709', true);
        Toast.info('New OTP Sent', `Code dispatched to ${currentEmail}`);
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
            <p class="text-sm" style="color: var(--text-secondary);">
              Enter your registered email address. A secure password reset link will be dispatched.
            </p>
            <div class="form-group">
              <label class="form-label" for="reset-email" style="color: var(--rose-200);">Registered Email</label>
              <input type="email" id="reset-email" class="input-field" placeholder="name@example.com" value="${loginIdentifier.value || ''}" />
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
            Toast.success('Password Reset Dispatched', 'Check your email inbox for instructions.');
          });
        }
      });
    });
  }
};
