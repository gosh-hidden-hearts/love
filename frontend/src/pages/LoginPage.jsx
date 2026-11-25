import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Phone,
  Mail,
  Heart, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Key
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import InstallPWA from '../components/InstallPWA';
import logoImg from '../assets/logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loginWithOtp, loginWithGoogle, loginWithGoogleRedirect } = useAuth();

  // If already authenticated or becomes authenticated, redirect to /chats immediately
  useEffect(() => {
    if (user) {
      navigate('/chats', { replace: true });
    }
  }, [user, navigate]);

  // Pre-fill state passed from signup or recovery redirects
  useEffect(() => {
    if (location.state?.email) {
      setIdentifier(location.state.email);
      setOtpIdentifier(location.state.email);
      setForgotIdentifier(location.state.email);
    }
    if (location.state?.openForgot) {
      setShowForgotModal(true);
      setForgotStep(1);
    }
  }, [location.state]);

  // Login Mode Tab
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'otp'

  // Password Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Phone / Email OTP Login state
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState({ text: '', type: '' });
  const [resendTimer, setResendTimer] = useState(0);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: input identifier & send OTP, 2: verify OTP, 3: new password
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });
  const [resolvedForgotEmail, setResolvedForgotEmail] = useState('');

  // Handle standard password login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide your login ID and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/chats', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      let msg = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect password or identifier.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this identifier.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Send Login OTP
  const handleSendLoginOtp = async (e) => {
    e.preventDefault();
    if (!otpIdentifier.trim()) {
      setOtpMsg({ text: 'Please enter your registered mobile number or email.', type: 'error' });
      return;
    }

    setOtpLoading(true);
    setOtpMsg({ text: '', type: '' });
    try {
      const res = await api.sendOTP(null, 'login', otpIdentifier.trim());
      if (res.success) {
        setOtpSent(true);
        setOtpMsg({ 
          text: `A 6-digit login OTP was sent to ${res.email ? res.email.replace(/(.{2})(.*)(?=@)/, '$1***') : 'your registered contact'}.`, 
          type: 'success' 
        });
        startResendTimer();
      } else {
        throw new Error(res.message || 'Failed to dispatch login OTP.');
      }
    } catch (err) {
      setOtpMsg({ text: err.message || 'Could not send login OTP.', type: 'error' });
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle Verify Login OTP
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpMsg({ text: 'Please enter the complete 6-digit OTP code.', type: 'error' });
      return;
    }

    setOtpLoading(true);
    setOtpMsg({ text: '', type: '' });
    try {
      await loginWithOtp(otpIdentifier.trim(), otpCode.trim());
      navigate('/chats', { replace: true });
    } catch (err) {
      setOtpMsg({ text: err.message || 'OTP verification failed.', type: 'error' });
    } finally {
      setOtpLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Google OAuth Login
  const handleGoogleLogin = async (useRedirect = false) => {
    setError('');
    setGoogleLoading(true);
    try {
      if (useRedirect) {
        await loginWithGoogleRedirect();
        return;
      }
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        navigate('/chats', { replace: true });
      }
    } catch (err) {
      console.warn('Google login notice:', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed. If popups are blocked or not working on your device, use the redirect option below.');
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

  // Forgot password OTP flow
  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setForgotLoading(true);
    setForgotMsg({ text: '', type: '' });
    try {
      let email = forgotIdentifier.trim();
      if (!email.includes('@')) {
        const res = await api.resolveIdentifier(email);
        if (!res.success || !res.email) {
          throw new Error('No account found with this username or mobile number.');
        }
        email = res.email;
      }
      setResolvedForgotEmail(email);

      const otpRes = await api.sendOTP(email, 'forgot_password');
      if (otpRes.success) {
        setForgotStep(2);
        setForgotMsg({ text: `A 6-digit security OTP was sent to ${email.replace(/(.{2})(.*)(?=@)/, '$1***')}.`, type: 'success' });
      } else {
        throw new Error(otpRes.message || 'Failed to send OTP email.');
      }
    } catch (err) {
      setForgotMsg({ text: err.message || 'Error resolving account or sending email.', type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim()) return;
    setForgotLoading(true);
    setForgotMsg({ text: '', type: '' });
    try {
      const res = await api.verifyOTP(resolvedForgotEmail, forgotOtp.trim(), 'forgot_password');
      if (res.success) {
        setForgotStep(3);
        setForgotMsg({ text: 'OTP verified successfully! Set your new password.', type: 'success' });
      } else {
        throw new Error(res.message || 'Invalid or expired OTP.');
      }
    } catch (err) {
      setForgotMsg({ text: err.message, type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.resetPasswordWithOtp(resolvedForgotEmail, forgotOtp.trim(), newPassword);
      if (res.success) {
        setForgotMsg({ text: 'Password reset successful! You can now log in.', type: 'success' });
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep(1);
        }, 2000);
      } else {
        throw new Error(res.message || 'Password update failed.');
      }
    } catch (err) {
      setForgotMsg({ text: 'Could not reset password: ' + err.message, type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full bg-[#08090e] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative overflow-x-hidden text-slate-100 select-none">
      {/* Background glowing spheres strictly contained to prevent horizontal scrolling */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl" />
      </div>

      {/* Main Unified Card (Single column on mobile, Balanced 2-panel on desktop) */}
      <div className="w-full max-w-md lg:max-w-4xl xl:max-w-5xl glass-panel rounded-3xl shadow-2xl border border-white/10 relative z-10 m-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">

          {/* =========================================================================
              LEFT LOGIN PANEL: Authentication & Inputs (Email, Username, Mobile, OTP)
             ========================================================================= */}
          <div className="lg:col-span-7 p-5 sm:p-7 lg:p-8 flex flex-col justify-center">
            {/* Mobile Brand Header (< lg only) */}
            <div className="text-center mb-5 lg:hidden">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden border border-rose-500/40 shadow-glow-pink mb-2.5 bg-[#0c0d18] hover:scale-105 transition duration-300">
                <img src={logoImg} alt="GOSH Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
                GOSH <Sparkles className="w-4 h-4 text-rose-400" />
              </h1>
              <p className="text-[11px] text-rose-300 font-semibold tracking-widest uppercase font-mono">Hidden Hearts</p>
              <p className="text-xs text-slate-400 mt-1">Sign in to your private romantic communication sanctuary</p>
            </div>

            {/* Desktop Left Panel Header (lg+ only) */}
            <div className="hidden lg:block mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 mb-2 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Hidden Hearts Sanctuary
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h2>
              <p className="text-xs text-slate-400 mt-1">Sign in to access your private romantic communication space</p>
            </div>

            {/* Login Method Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl mb-4 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('password');
                  setError('');
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  loginMode === 'password'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-glow-pink'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Password Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('otp');
                  setError('');
                  setOtpMsg({ text: '', type: '' });
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  loginMode === 'otp'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-glow-pink'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Phone / Email OTP
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* =========================================================================
                TAB 1: PASSWORD LOGIN (Username, Email, or Mobile + Password)
               ========================================================================= */}
            {loginMode === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Login ID <span className="text-slate-500 font-normal">(Email, @username, or Mobile)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@domain.com or @username or +91..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotStep(1);
                        setForgotMsg({ text: '', type: '' });
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 transition"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl btn-romantic-primary font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 mt-1 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to GOSH</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* =========================================================================
                TAB 2: PHONE / EMAIL OTP LOGIN (WhatsApp style)
               ========================================================================= */}
            {loginMode === 'otp' && (
              <div className="space-y-3.5">
                {otpMsg.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                    otpMsg.type === 'success' 
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}>
                    {otpMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>{otpMsg.text}</span>
                  </div>
                )}

                {!otpSent ? (
                  <form onSubmit={handleSendLoginOtp} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Phone Number or Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={otpIdentifier}
                          onChange={(e) => setOtpIdentifier(e.target.value)}
                          placeholder="+91... or email@domain.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:outline-none transition"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">We will send a 6-digit OTP code to verify your account.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full py-3 rounded-xl btn-romantic-primary font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                    >
                      {otpLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Send 6-Digit Login Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyLoginOtp} className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-slate-300">
                          Verification Code
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpCode('');
                          }}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          Change ID
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center tracking-[0.5em] text-xl font-mono px-4 py-2.5 rounded-xl glass-input text-white placeholder-slate-500 focus:outline-none"
                        autoFocus
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full py-3 rounded-xl btn-romantic-green font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                    >
                      {otpLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Enter GOSH</span>
                          <ShieldCheck className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Resend OTP */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        disabled={resendTimer > 0 || otpLoading}
                        onClick={handleSendLoginOtp}
                        className="text-xs text-slate-400 hover:text-rose-300 disabled:opacity-50 transition"
                      >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Code'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="relative my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono">
                <span className="bg-[#0f111a] px-2.5 text-slate-500">or connect with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={() => handleGoogleLogin(false)}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-xs text-white flex items-center justify-center gap-2.5 transition cursor-pointer"
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
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleGoogleLogin(true)}
              disabled={googleLoading}
              className="w-full mt-1.5 text-[10px] text-slate-400 hover:text-rose-300 transition text-center underline cursor-pointer"
            >
              Popup blocked or closed? Sign in with Google Redirect
            </button>

            {/* Signup Link */}
            <p className="mt-4 text-center text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-rose-400 font-semibold hover:underline">
                Create New Account
              </Link>
            </p>
          </div>

          {/* =========================================================================
              RIGHT PANEL: GOSH Brand Sanctuary & Feature Showcase (Desktop lg+)
             ========================================================================= */}
          <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-7 lg:p-8 bg-gradient-to-br from-[#121424]/90 via-[#0e101c]/90 to-[#090a12]/90 border-l border-white/5 overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Brand Showcase */}
            <div className="relative z-10">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-rose-500/40 shadow-glow-pink bg-[#0c0d18] flex-shrink-0">
                  <img src={logoImg} alt="GOSH Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                    GOSH <Sparkles className="w-4 h-4 text-rose-400" />
                  </h3>
                  <p className="text-[10px] text-rose-300 font-semibold tracking-widest uppercase font-mono">Hidden Hearts</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                WhatsApp-inspired romantic social networking & private communication sanctuary designed for two.
              </p>
            </div>

            {/* Middle Feature Highlights */}
            <div className="space-y-3.5 relative z-10 my-6">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-rose-500/20 transition">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-rose-100">End-to-End Encrypted</h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    ECDH P-256 encrypted messaging exclusively between you and your soulmate.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-pink-500/20 transition">
                <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center flex-shrink-0 text-pink-300">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-pink-100">Secret Memory Vault</h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Store confidential romantic photos, videos and milestones with cloud backup.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-emerald-100">Romantic Privacy</h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Real-time WebRTC audio/video calls, private status updates, and hidden chats.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Footer Slogan */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
              <span className="flex items-center gap-1.5 text-rose-300/80">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> 100% Private Sanctuary
              </span>
              <span className="text-slate-500 font-mono text-[10px]">WhatsApp-Inspired</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-rose-500/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" /> Account Recovery
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {forgotStep === 1 && 'Enter your registered email, username, or mobile to receive a 6-digit OTP.'}
              {forgotStep === 2 && 'Enter the 6-digit OTP code sent via Google SMTP.'}
              {forgotStep === 3 && 'Create a new secure password for your GOSH account.'}
            </p>

            {forgotMsg.text && (
              <div className={`p-3 mb-4 rounded-xl text-xs flex items-center gap-2 ${forgotMsg.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'}`}>
                {forgotMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{forgotMsg.text}</span>
              </div>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleSendForgotOtp} className="space-y-4">
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Registered email or @username or mobile"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:outline-none"
                  required
                />
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 rounded-xl btn-romantic-primary text-xs font-medium"
                  >
                    {forgotLoading ? 'Sending OTP...' : 'Send OTP via Email'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] text-xl font-mono px-4 py-3 rounded-xl glass-input text-white placeholder-slate-500 focus:outline-none"
                  required
                />
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 rounded-xl btn-romantic-green text-xs font-medium"
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:outline-none"
                  required
                />
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 rounded-xl btn-romantic-primary text-xs font-medium"
                  >
                    {forgotLoading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Progressive Web App Android Install Experience */}
      <InstallPWA />
    </div>
  );
}