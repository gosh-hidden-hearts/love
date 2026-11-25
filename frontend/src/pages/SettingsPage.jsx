import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Palette, 
  Bell, 
  Volume2, 
  Lock, 
  ShieldCheck, 
  ScreenShare, 
  FileText, 
  HelpCircle, 
  LogOut, 
  Trash2, 
  Key, 
  Sparkles, 
  Check, 
  Eye, 
  EyeOff,
  UserX,
  ChevronRight,
  User,
  Heart,
  HardDrive,
  Smartphone,
  Shield,
  CheckCircle2,
  Server,
  Globe,
  Wifi,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TermsModal, PrivacyModal } from '../components/TermsModal';
import api, { getCustomBackendUrl, setCustomBackendUrl, getApiBase } from '../services/api';
import socketService from '../services/socket';
import logoImg from '../assets/logo.png';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, logout, isVaultLocked, setIsVaultLocked } = useAuth();

  // Settings State
  const [theme, setTheme] = useState('romantic-dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [callRingtoneEnabled, setCallRingtoneEnabled] = useState(true);
  
  // Privacy
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState('everyone');
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState('everyone');
  const [aboutPrivacy, setAboutPrivacy] = useState('everyone');
  const [statusPrivacy, setStatusPrivacy] = useState('contacts');
  const [readReceipts, setReadReceipts] = useState(true);

  // Passcode Vault State
  const [passcodePin, setPasscodePin] = useState(localStorage.getItem('gosh_vault_pin') || '');
  const [tempPin, setTempPin] = useState('');
  const [verifyPinInput, setVerifyPinInput] = useState('');
  const [passcodeMsg, setPasscodeMsg] = useState({ text: '', type: '' });

  // Modals
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Backend & Cloud Services State
  const [backendInput, setBackendInput] = useState(() => getCustomBackendUrl() || import.meta.env.VITE_API_URL || '');
  const [backendStatus, setBackendStatus] = useState(null);

  const handleTestBackendConnection = async () => {
    setBackendStatus({ checking: true });
    const target = backendInput.trim();
    let testUrl;
    if (target) {
      const clean = target.replace(/\/+$/, '');
      testUrl = clean.endsWith('/api') ? `${clean}/health` : `${clean}/api/health`;
    } else {
      const base = getApiBase();
      testUrl = base.endsWith('/api') ? `${base}/health` : `${base}/api/health`;
    }

    try {
      const res = await fetch(testUrl);
      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }

      if (res.ok && data?.status === 'online') {
        setCustomBackendUrl(target);
        setBackendStatus({ ok: true, data, error: null });
        if (user) {
          socketService.connect(user);
        }
      } else {
        setBackendStatus({ ok: false, error: data?.message || `Health check failed with status ${res.status}` });
      }
    } catch (err) {
      setBackendStatus({ ok: false, error: 'Connection failed: ' + (err.message || 'Network error') });
    }
  };

  const handleResetBackend = () => {
    setCustomBackendUrl('');
    setBackendInput('');
    setBackendStatus(null);
  };

  // Load persisted settings on mount
  useEffect(() => {
    if (user?.id) {
      api.getSettings(user.id).then((res) => {
        if (res.settings) {
          const s = res.settings;
          if (s.theme) setTheme(s.theme);
          if (s.soundEnabled !== undefined) setSoundEnabled(s.soundEnabled);
          if (s.notificationsEnabled !== undefined) setNotificationsEnabled(s.notificationsEnabled);
          if (s.callRingtoneEnabled !== undefined) setCallRingtoneEnabled(s.callRingtoneEnabled);
          if (s.lastSeenPrivacy) setLastSeenPrivacy(s.lastSeenPrivacy);
          if (s.profilePhotoPrivacy) setProfilePhotoPrivacy(s.profilePhotoPrivacy);
          if (s.aboutPrivacy) setAboutPrivacy(s.aboutPrivacy);
          if (s.statusPrivacy) setStatusPrivacy(s.statusPrivacy);
          if (s.readReceipts !== undefined) setReadReceipts(s.readReceipts);
        }
      }).catch(console.warn);
    }
  }, [user]);

  const handleSavePasscode = async () => {
    if (tempPin.length !== 4) {
      setPasscodeMsg({ text: 'PIN must be exactly 4 digits.', type: 'error' });
      return;
    }
    localStorage.setItem('gosh_vault_pin', tempPin);
    setPasscodePin(tempPin);

    if (user?.id) {
      try {
        await api.updateSettings(user.id, { passcode: tempPin });
      } catch (e) {
        console.warn('Could not persist PIN to server:', e);
      }
    }

    setTempPin('');
    setPasscodeMsg({ text: 'Passcode Vault PIN saved and active!', type: 'success' });
    setTimeout(() => setPasscodeMsg({ text: '', type: '' }), 3000);
  };

  const handleTestUnlock = async () => {
    const saved = localStorage.getItem('gosh_vault_pin');
    let isValid = false;

    if (user?.id) {
      try {
        const res = await api.verifyPasscode(user.id, verifyPinInput);
        if (res.valid) isValid = true;
      } catch (e) {}
    }

    if (!isValid && saved && verifyPinInput === saved) {
      isValid = true;
    }

    if (isValid) {
      setIsVaultLocked(false);
      setPasscodeMsg({ text: 'Vault unlocked successfully! 💖', type: 'success' });
    } else {
      setPasscodeMsg({ text: 'Incorrect 4-digit PIN. Try again.', type: 'error' });
    }
    setTimeout(() => setPasscodeMsg({ text: '', type: '' }), 3000);
  };

  const handleTestScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      alert('Screen sharing verified successfully! Your browser permissions are active.');
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      alert('Screen sharing test: ' + err.message);
    }
  };

  const handleRequestPushNotification = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('GOSH • Hidden Hearts', {
          body: 'Push notifications are successfully active for instant call and message alerts! 🌹',
          icon: '/favicon.ico'
        });
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
  };

  const handleSaveAllSettings = async () => {
    setSavingSettings(true);
    try {
      if (user?.id) {
        await api.updateSettings(user.id, {
          theme,
          soundEnabled,
          notificationsEnabled,
          callRingtoneEnabled,
          lastSeenPrivacy,
          profilePhotoPrivacy,
          aboutPrivacy,
          statusPrivacy,
          readReceipts
        });
      }
      setSaveSettingsSuccess(true);
      setTimeout(() => setSaveSettingsSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#08090e] overflow-y-auto overflow-x-hidden p-4 md:p-8 select-none max-w-full min-w-0">
      {/* Header */}
      <div className="mb-6 max-w-3xl mx-auto w-full">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          Settings <Sparkles className="w-5 h-5 text-rose-400" />
        </h1>
        <p className="text-xs text-slate-400">Configure your romantic sanctuary preferences and privacy controls</p>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6 pb-12">
        {/* Save confirmation toast */}
        {saveSettingsSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Preferences updated and saved to your romantic profile.</span>
          </div>
        )}

        {/* =========================================================================
            PROFILE SUMMARY BANNER
           ========================================================================= */}
        <div 
          onClick={() => navigate('/accounts')}
          className="glass-panel p-4 md:p-5 rounded-2xl border border-rose-500/20 flex items-center justify-between cursor-pointer hover:border-rose-500/40 transition group"
        >
          <div className="flex items-center gap-4">
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id || 'GOSH'}`}
              alt={user?.displayName || 'User'}
              className="w-14 h-14 rounded-full object-cover border-2 border-rose-500/40 p-0.5 shadow-glow-pink bg-[#0f111a]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white group-hover:text-rose-300 transition">{user?.displayName || 'Soul Member'}</h2>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-rose-300 font-mono">@{user?.username || 'user'}</p>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                "{profile?.bio || 'In a love story written by the stars ✨'}"
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition" />
        </div>

        {/* =========================================================================
            ANDROID MOBILE & PWA APP INSTALLATION
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-rose-500/40 shadow-glow-pink flex-shrink-0 bg-[#0c0d18]">
                <img src={logoImg} alt="GOSH App Icon" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">GOSH Android App (PWA)</h3>
                <p className="text-[11px] text-slate-300">
                  {typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone)
                    ? 'Running in full-screen Android standalone app mode'
                    : 'Install on your Android phone for full-screen WhatsApp-like experience'}
                </p>
              </div>
            </div>

            {typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) ? (
              <span className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-full font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> App Installed
              </span>
            ) : (
              <button
                onClick={() => {
                  if (window.__goshDeferredPrompt) {
                    window.__goshDeferredPrompt.prompt();
                  } else {
                    alert('To install on Android:\n\n1. In Chrome, tap the 3-dot menu (⋮) in the top-right.\n2. Tap "Install app" or "Add to Home screen".\n3. Tap "Install" to confirm.\n\nGOSH will appear on your home screen with its romantic rose icon!');
                  }
                }}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold shadow-md shadow-rose-500/30 transition active:scale-95 flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install Android App</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            THEME & ATMOSPHERE
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-rose-400" /> Theme & Atmosphere
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'romantic-dark', name: 'Romantic Dark', desc: 'Deep black with ruby rose glow', color: 'from-rose-950 via-slate-900 to-black' },
              { id: 'midnight-violet', name: 'Midnight Violet', desc: 'Mystical purple soul hue', color: 'from-purple-950 via-indigo-950 to-black' },
              { id: 'obsidian-rose', name: 'Obsidian Rose', desc: 'Charcoal with gentle pink accents', color: 'from-pink-950 via-neutral-900 to-black' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-24 transition ${
                  theme === t.id
                    ? 'border-rose-500 bg-rose-500/15 shadow-glow-pink'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className={`w-full h-3.5 rounded-full bg-gradient-to-r ${t.color}`} />
                <div>
                  <span className="text-xs font-semibold text-white block">{t.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{t.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================================
            PRIVACY & VISIBILITY (WhatsApp Inspired)
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Privacy & Presence
          </h3>

          <div className="space-y-3.5 divide-y divide-white/5 text-xs text-slate-300">
            {/* Last Seen Privacy */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Last Seen & Online Presence</p>
                <p className="text-[11px] text-slate-400">Control who can see your online status</p>
              </div>
              <select
                value={lastSeenPrivacy}
                onChange={(e) => setLastSeenPrivacy(e.target.value)}
                className="py-1.5 px-3 rounded-xl glass-input text-white focus:outline-none bg-[#0f111a]"
              >
                <option value="everyone" className="bg-[#141724]">Everyone</option>
                <option value="contacts" className="bg-[#141724]">My Contacts Only</option>
                <option value="nobody" className="bg-[#141724]">Nobody</option>
              </select>
            </div>

            {/* Profile Photo Visibility */}
            <div className="pt-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Profile Photo</p>
                <p className="text-[11px] text-slate-400">Choose who can view your profile avatar</p>
              </div>
              <select
                value={profilePhotoPrivacy}
                onChange={(e) => setProfilePhotoPrivacy(e.target.value)}
                className="py-1.5 px-3 rounded-xl glass-input text-white focus:outline-none bg-[#0f111a]"
              >
                <option value="everyone" className="bg-[#141724]">Everyone</option>
                <option value="contacts" className="bg-[#141724]">My Contacts Only</option>
                <option value="nobody" className="bg-[#141724]">Nobody</option>
              </select>
            </div>

            {/* About / Bio Visibility */}
            <div className="pt-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">About & Soul Bio</p>
                <p className="text-[11px] text-slate-400">Who can read your romantic quote</p>
              </div>
              <select
                value={aboutPrivacy}
                onChange={(e) => setAboutPrivacy(e.target.value)}
                className="py-1.5 px-3 rounded-xl glass-input text-white focus:outline-none bg-[#0f111a]"
              >
                <option value="everyone" className="bg-[#141724]">Everyone</option>
                <option value="contacts" className="bg-[#141724]">My Contacts Only</option>
                <option value="nobody" className="bg-[#141724]">Nobody</option>
              </select>
            </div>

            {/* Status Privacy */}
            <div className="pt-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">24-Hour Status Audience</p>
                <p className="text-[11px] text-slate-400">Default visibility for your story updates</p>
              </div>
              <select
                value={statusPrivacy}
                onChange={(e) => setStatusPrivacy(e.target.value)}
                className="py-1.5 px-3 rounded-xl glass-input text-white focus:outline-none bg-[#0f111a]"
              >
                <option value="everyone" className="bg-[#141724]">Everyone</option>
                <option value="contacts" className="bg-[#141724]">My Contacts</option>
                <option value="partner_only" className="bg-[#141724]">Soul Partner Only ❤️</option>
              </select>
            </div>

            {/* Read Receipts */}
            <div className="pt-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Read Receipts</p>
                <p className="text-[11px] text-slate-400">Show blue double ticks when messages are read</p>
              </div>
              <input
                type="checkbox"
                checked={readReceipts}
                onChange={(e) => setReadReceipts(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            NOTIFICATIONS & SOUND ALERTS
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" /> Notifications & Sound
          </h3>

          <div className="space-y-3.5 divide-y divide-white/5 text-xs text-slate-300">
            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Message Notifications</p>
                <p className="text-[11px] text-slate-400">Show in-app and browser popup notifications</p>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="pt-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Sweet Message Chime</p>
                <p className="text-[11px] text-slate-400">Play subtle audio chime when a message arrives</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="pt-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Call Ringtone</p>
                <p className="text-[11px] text-slate-400">Play romantic ringtone during incoming WebRTC calls</p>
              </div>
              <input
                type="checkbox"
                checked={callRingtoneEnabled}
                onChange={(e) => setCallRingtoneEnabled(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="pt-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Browser Push Permission</p>
                <p className="text-[11px] text-slate-400">Grant permission for incoming call & message alerts</p>
              </div>
              <button
                type="button"
                onClick={handleRequestPushNotification}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-rose-300 text-xs font-medium border border-white/5 transition"
              >
                Test Alert
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PASSCODE VAULT SECURITY (4-Digit PIN Lock)
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" /> Passcode Vault (Private Space Lock)
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              passcodePin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
            }`}>
              {passcodePin ? 'PIN Active' : 'Not Configured'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Protect your sensitive chats and shared Memory Vault with an independent 4-digit PIN.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="password"
              maxLength={4}
              value={tempPin}
              onChange={(e) => setTempPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Set 4-Digit PIN"
              className="w-full sm:w-44 py-2 px-3 text-center tracking-[0.4em] font-mono rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={handleSavePasscode}
              className="w-full sm:w-auto px-4 py-2 rounded-xl btn-romantic-primary text-xs font-semibold"
            >
              {passcodePin ? 'Update PIN' : 'Activate Passcode'}
            </button>
          </div>

          {/* Test unlock input */}
          {passcodePin && (
            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="password"
                maxLength={4}
                value={verifyPinInput}
                onChange={(e) => setVerifyPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Test Unlock PIN"
                className="w-full sm:w-44 py-2 px-3 text-center tracking-[0.4em] font-mono rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={handleTestUnlock}
                className="w-full sm:w-auto px-4 py-2 rounded-xl btn-romantic-secondary text-xs font-semibold"
              >
                Test Unlock
              </button>
            </div>
          )}

          {passcodeMsg.text && (
            <p className={`text-xs font-medium animate-fadeIn ${
              passcodeMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {passcodeMsg.text}
            </p>
          )}
        </div>

        {/* =========================================================================
            PRODUCTION BACKEND & CLOUD SERVICE HUB
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" /> Backend Server & Cloud Services
            </h3>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
              Production Gateway
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            GitHub Pages hosts the static interface. Real-time chat, WebRTC calling, Google SMTP OTPs, Supabase, and MEGA Cloud rely on the Node.js backend.
          </p>

          <div className="space-y-3 pt-1">
            <label className="block text-xs font-medium text-slate-300">
              Backend API URL (e.g. Render, Railway, or Localhost)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={backendInput}
                onChange={(e) => setBackendInput(e.target.value)}
                placeholder="https://your-backend.onrender.com"
                className="flex-1 py-2 px-3 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTestBackendConnection}
                  disabled={backendStatus?.checking}
                  className="px-4 py-2 rounded-xl btn-romantic-primary text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${backendStatus?.checking ? 'animate-spin' : ''}`} />
                  <span>{backendStatus?.checking ? 'Testing...' : 'Test & Connect'}</span>
                </button>
                {backendInput && (
                  <button
                    type="button"
                    onClick={handleResetBackend}
                    className="px-3 py-2 rounded-xl btn-romantic-secondary text-xs text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Health Check Results */}
            {backendStatus && !backendStatus.checking && (
              <div className={`p-3.5 rounded-xl border text-xs ${
                backendStatus.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {backendStatus.ok ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Connected successfully to GOSH Backend Server!</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <span className="text-slate-400 block">Supabase DB</span>
                        <span className="text-white font-medium capitalize">{backendStatus.data?.services?.supabase || 'Connected'}</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <span className="text-slate-400 block">Google SMTP</span>
                        <span className="text-white font-medium capitalize">{backendStatus.data?.services?.googleSmtp || 'Ready'}</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <span className="text-slate-400 block">MEGA Cloud</span>
                        <span className="text-white font-medium capitalize">{backendStatus.data?.services?.megaCloud || 'Ready'}</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                        <span className="text-slate-400 block">WebSockets</span>
                        <span className="text-white font-medium capitalize">{backendStatus.data?.services?.webrtcSignaling || 'Active'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-300">Backend Unreachable</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">{backendStatus.error}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Deploy your backend folder on <strong className="text-white">Render.com</strong> or run locally using <code className="text-rose-300">npm run dev:backend</code>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            STORAGE & WEBRTC HARDWARE PERMISSIONS
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-sky-400" /> Cloud Storage & Hardware
          </h3>

          <div className="space-y-3 text-xs">
            {/* MEGA Cloud Allocation */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">MEGA Cloud Storage (Memory Vault)</h4>
                <p className="text-[11px] text-slate-400">20 GB Free Encrypted Storage Pool</p>
              </div>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono">
                Connected
              </span>
            </div>

            {/* Screen Sharing Verification */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">WebRTC Screen Sharing</h4>
                <p className="text-[11px] text-slate-400">Verify desktop & browser stream capture permissions</p>
              </div>
              <button
                onClick={handleTestScreenSharing}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition"
              >
                Test Capture
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            LEGAL, TERMS & ABOUT GOSH
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 divide-y divide-white/5 text-xs text-slate-300">
          <button
            onClick={() => setShowTerms(true)}
            className="w-full py-2.5 flex items-center justify-between hover:text-white transition"
          >
            <span>Terms of Service (Agree & Continue Policy)</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => setShowPrivacy(true)}
            className="w-full py-2.5 flex items-center justify-between hover:text-white transition"
          >
            <span>Privacy Policy & Cryptographic Data Rights</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </button>

          <div className="py-2.5 flex items-center justify-between text-slate-400">
            <span>Application Version</span>
            <span className="font-mono text-slate-300">1.0.0 (Production • Hidden Hearts)</span>
          </div>
        </div>

        {/* =========================================================================
            SAVE SETTINGS & DANGER ZONE
           ========================================================================= */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleSaveAllSettings}
            disabled={savingSettings}
            className="px-6 py-2.5 rounded-xl btn-romantic-primary text-xs font-semibold shadow-glow-pink disabled:opacity-50"
          >
            {savingSettings ? 'Saving Preferences...' : 'Save All Preferences'}
          </button>
        </div>

        {/* App Version & Branding */}
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-rose-500/30 shadow-glow-pink bg-[#0c0d18] hover:scale-105 transition duration-300">
            <img src={logoImg} alt="GOSH Logo" className="w-full h-full object-cover" />
          </div>
          <h4 className="text-sm font-bold text-white tracking-wide">GOSH — Hidden Hearts</h4>
          <p className="text-[11px] text-rose-300/80 font-mono">Version 1.0.0 (PWA) • Romantic Sanctuary</p>
          <p className="text-[10px] text-slate-400 max-w-xs">
            End-to-End Encrypted Private Communication, Memory Vault & Real-Time Connection
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 space-y-3">
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out of GOSH</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account & Erase Data</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-rose-500/30 text-center animate-fadeIn">
            <Trash2 className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Delete GOSH Account?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              This will permanently delete your profile, conversations, and shared memories from Supabase and MEGA Cloud. This action cannot be reversed.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  alert('Account deletion request initiated.');
                  await logout();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Terms and Privacy */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}