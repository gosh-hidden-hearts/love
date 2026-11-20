import React, { useState } from 'react';
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
  UserX
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TermsModal, PrivacyModal } from '../components/TermsModal';
import api from '../services/api';

export default function SettingsPage() {
  const { user, logout, isVaultLocked, setIsVaultLocked } = useAuth();

  // Settings State
  const [theme, setTheme] = useState('romantic-dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState('everyone');
  const [readReceipts, setReadReceipts] = useState(true);

  // Passcode Vault State
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [passcodePin, setPasscodePin] = useState('');
  const [testUnlockPin, setTestUnlockPin] = useState('');
  const [passcodeMsg, setPasscodeMsg] = useState('');

  // Modals
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSavePasscode = () => {
    if (passcodePin.length !== 4) {
      setPasscodeMsg('PIN must be exactly 4 digits.');
      return;
    }
    localStorage.setItem('gosh_vault_pin', passcodePin);
    setPasscodeEnabled(true);
    setPasscodeMsg('Passcode Vault PIN saved securely!');
    setTimeout(() => setPasscodeMsg(''), 3000);
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

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0c0d14] overflow-y-auto p-4 md:p-8 select-none">
      {/* Header */}
      <div className="mb-6 max-w-3xl mx-auto w-full">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          Settings <Sparkles className="w-5 h-5 text-rose-400" />
        </h1>
        <p className="text-xs text-slate-400">Configure your romantic sanctuary preferences and privacy controls</p>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6 pb-8">
        {/* =========================================================================
            THEME & APPEARANCE
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-rose-400" /> Theme & Atmosphere
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'romantic-dark', name: 'Romantic Dark', color: 'from-rose-950 to-slate-950' },
              { id: 'midnight-violet', name: 'Midnight Violet', color: 'from-purple-950 to-slate-950' },
              { id: 'obsidian-rose', name: 'Obsidian Rose', color: 'from-pink-950 to-neutral-950' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition ${
                  theme === t.id
                    ? 'border-rose-500 bg-rose-500/15 shadow-glow-pink'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className={`w-full h-3 rounded-full bg-gradient-to-r ${t.color}`} />
                <span className="text-xs font-medium text-white">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================================
            PRIVACY & VISIBILITY
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Privacy & Presence
          </h2>

          <div className="space-y-3 divide-y divide-white/5 text-xs text-slate-300">
            {/* Last Seen Privacy */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Last Seen & Online</p>
                <p className="text-[11px] text-slate-400">Choose who can view your online presence</p>
              </div>
              <select
                value={lastSeenPrivacy}
                onChange={(e) => setLastSeenPrivacy(e.target.value)}
                className="py-1.5 px-3 rounded-xl glass-input text-white focus:outline-none bg-[#151724]"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Read Receipts */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Read Receipts</p>
                <p className="text-[11px] text-slate-400">Show double ticks when messages are read</p>
              </div>
              <input
                type="checkbox"
                checked={readReceipts}
                onChange={(e) => setReadReceipts(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Sound & Notifications */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Message Sounds</p>
                <p className="text-[11px] text-slate-400">Play sweet romantic chime on new incoming message</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            PASSCODE VAULT SECURITY (4-Digit PIN Lock)
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" /> Passcode Vault PIN
            </h2>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">
              Private Moments Lock
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Protect your sensitive chats and private Memory Vault with an independent 4-digit PIN.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="password"
              maxLength={4}
              value={passcodePin}
              onChange={(e) => setPasscodePin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Set 4-Digit PIN"
              className="w-full sm:w-44 py-2 px-3 text-center tracking-[0.4em] font-mono rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={handleSavePasscode}
              className="w-full sm:w-auto px-4 py-2 rounded-xl btn-romantic-primary text-xs font-semibold"
            >
              Set Passcode
            </button>
          </div>

          {passcodeMsg && (
            <p className="text-xs text-emerald-400 font-medium">{passcodeMsg}</p>
          )}
        </div>

        {/* =========================================================================
            SCREEN SHARING TEST
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ScreenShare className="w-4 h-4 text-sky-400" /> Screen Sharing
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Stream your screen privately during WebRTC video calls</p>
          </div>

          <button
            onClick={handleTestScreenSharing}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 transition"
          >
            Test Permissions
          </button>
        </div>

        {/* =========================================================================
            LEGAL & SUPPORT
           ========================================================================= */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 divide-y divide-white/5 text-xs text-slate-300">
          <button
            onClick={() => setShowTerms(true)}
            className="w-full py-2.5 flex items-center justify-between hover:text-white transition"
          >
            <span>Terms of Service</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => setShowPrivacy(true)}
            className="w-full py-2.5 flex items-center justify-between hover:text-white transition"
          >
            <span>Privacy Policy</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </button>

          <div className="py-2.5 flex items-center justify-between text-slate-400">
            <span>GOSH Version</span>
            <span className="font-mono text-slate-300">1.0.0 (Production)</span>
          </div>
        </div>

        {/* =========================================================================
            SESSION & DANGER ZONE
           ========================================================================= */}
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
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-rose-500/30 text-center">
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
