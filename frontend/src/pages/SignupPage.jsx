import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Phone, Heart, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle, loginWithGoogleRedirect } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP flow states
  const [currentStep, setCurrentStep] = useState(1); // 1: Registration Form, 2: OTP Verification
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 3) return { score: 60, label: 'Fair', color: 'bg-amber-500' };
    if (score === 4) return { score: 85, label: 'Strong', color: 'bg-emerald-500' };
    return { score: 100, label: 'Very Strong', color: 'bg-purple-500' };
  };

  const strength = getPasswordStrength(password);

  // Step 1: Validate inputs and trigger Google SMTP OTP
  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!email.trim() || !displayName.trim() || !password) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check username / mobile availability
      if (username || mobile) {
        const availCheck = await api.checkAvailability(username.trim(), mobile.trim());
        if (!availCheck.available) {
          throw new Error(availCheck.message || 'Username or mobile number is already taken.');
        }
      }

      // 2. Send Google SMTP OTP
      const otpRes = await api.sendOTP(email.trim(), 'signup');
      if (otpRes.success) {
        setCurrentStep(2);
        setSuccessMsg(`A 6-digit verification code has been dispatched to ${email.trim()} via Google SMTP.`);
        startResendTimer();
      } else {
        throw new Error(otpRes.message || 'Failed to dispatch verification OTP.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred while creating your account.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and finalize Firebase + Supabase account
  const handleVerifyOtpAndCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify OTP with backend
      const verifyRes = await api.verifyOTP(email.trim(), otp.trim(), 'signup');
      if (!verifyRes.success) {
        throw new Error(verifyRes.message || 'Invalid or expired OTP code.');
      }

      // 2. Create Firebase account & sync with Supabase
      await signup({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        username: username.trim() || email.trim().split('@')[0],
        mobile: mobile.trim() || null
      });

      // 3. Celebratory romantic confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#ec4899', '#c084fc', '#25d366']
      });

      // 4. Navigate to dashboard
      navigate('/');
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP timer
  const startResendTimer = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.sendOTP(email.trim(), 'signup');
      if (res.success) {
        setSuccessMsg('A new OTP has been sent to your email.');
        startResendTimer();
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (useRedirect = false) => {
    setError('');
    setGoogleLoading(true);
    try {
      if (useRedirect) {
        await loginWithGoogleRedirect();
        return;
      }
      const user = await loginWithGoogle();
      if (user) {
        confetti({ particleCount: 70, spread: 60, colors: ['#f43f5e', '#c084fc'] });
        navigate('/');
      }
    } catch (err) {
      console.warn('Google signup notice:', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing. If you are on mobile or popups are blocked, use the redirect option below.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized in Firebase Console! Please add 'gosh-hidden-hearts.github.io' under Firebase Console > Authentication > Settings > Authorized domains.");
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use the redirect button below.');
      } else {
        setError(err.message || 'Google Sign In was canceled or failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c0d14] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden text-slate-100 select-none">
      {/* Background glow effects */}
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-lg glass-panel p-8 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-purple-600/30 border border-rose-500/30 shadow-glow-pink mb-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Join GOSH <Sparkles className="w-4 h-4 text-rose-400" />
          </h1>
          <p className="text-xs text-rose-300 font-medium tracking-wider uppercase mt-0.5">
            Create Your Soul Sanctuary
          </p>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full ${currentStep === 1 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-500'}`}>
            <span>1</span> Details
          </div>
          <div className="w-6 h-0.5 bg-white/10" />
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full ${currentStep === 2 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500'}`}>
            <span>2</span> Email OTP
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Main Signup Form */}
        {currentStep === 1 ? (
          <form onSubmit={handleInitiateSignup} className="space-y-4">
            {/* Display Name & Username in 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Your Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Maya Ross"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username <span className="text-slate-500">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-semibold text-slate-400">@</span>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="mayaross"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Gmail / Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mobile Number <span className="text-slate-500">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password strength meter */}
            {password && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Password Strength</span>
                  <span className="font-medium text-slate-300">{strength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit to Step 2 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl btn-romantic-primary font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition disabled:opacity-60 mt-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Verification OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: OTP Verification Form */
          <form onSubmit={handleVerifyOtpAndCreate} className="space-y-5">
            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-300">
                Please enter the 6-digit verification code sent to
              </p>
              <p className="text-xs font-semibold text-rose-300 mt-0.5">{email}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">
                6-Digit Security OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 rounded-xl glass-input text-white placeholder-slate-600 focus:outline-none"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="hover:text-white transition"
              >
                ← Edit Details
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-rose-400 hover:text-rose-300 disabled:opacity-50 transition"
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 rounded-xl btn-romantic-green font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify OTP & Enter Sanctuary</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        {currentStep === 1 && (
          <>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#151724] px-3 text-slate-500">or sign up with</span>
              </div>
            </div>

            {/* Google Signup */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-xs text-white flex items-center justify-center gap-3 transition"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Quick Sign Up with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleGoogleSignup(true)}
              disabled={googleLoading}
              className="w-full mt-2 text-[11px] text-slate-400 hover:text-rose-300 transition text-center underline"
            >
              Popup blocked or closed? Sign up with Google Redirect
            </button>
          </>
        )}

        {/* Login Link */}
        <p className="mt-5 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-rose-400 font-semibold hover:underline">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
