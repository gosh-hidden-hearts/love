import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Heart, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: input identifier & send OTP, 2: verify OTP, 3: new password
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });
  const [resolvedForgotEmail, setResolvedForgotEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide your login ID and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/');
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

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google Sign In was canceled or failed: ' + err.message);
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

      // Send OTP via Google SMTP
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
      // In Firebase client, password reset can be completed via standard link or backend admin update
      await api.updateProfile(null, { email: resolvedForgotEmail, newPassword });
      setForgotMsg({ text: 'Password reset successful! You can now log in.', type: 'success' });
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
      }, 2000);
    } catch (err) {
      setForgotMsg({ text: 'Could not reset password: ' + err.message, type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c0d14] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden text-slate-100 select-none">
      {/* Background glowing spheres */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-purple-600/30 border border-rose-500/30 shadow-glow-pink mb-3">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            GOSH <Sparkles className="w-4 h-4 text-rose-400" />
          </h1>
          <p className="text-xs text-rose-300 font-medium tracking-wider uppercase mt-0.5">Glimpse Of Soul Hearts</p>
          <p className="text-xs text-slate-400 mt-2">Sign in to your private romantic sanctuary</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identifier input (supports Mobile, Username, Email) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Login ID <span className="text-slate-500 font-normal">(Email, Username, or Mobile)</span>
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
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:outline-none transition"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
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
                className="w-full pl-10 pr-11 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:outline-none transition"
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

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl btn-romantic-primary font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 mt-2"
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

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#151724] px-3 text-slate-500">or connect with</span>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-sm text-white flex items-center justify-center gap-3 transition"
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

        {/* Signup Link */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-rose-400 font-semibold hover:underline">
            Create New Account
          </Link>
        </p>
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
                {forgotMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
                  onChange={(e) => setForgotOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  className="w-full text-center tracking-widest text-lg font-mono px-4 py-3 rounded-xl glass-input text-white placeholder-slate-500 focus:outline-none"
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
    </div>
  );
}
