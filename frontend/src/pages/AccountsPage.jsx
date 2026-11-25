import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  ShieldCheck, 
  Calendar, 
  Heart, 
  Laptop, 
  Smartphone, 
  Key, 
  CheckCircle2, 
  Sparkles, 
  Save,
  Lock,
  Flame,
  Clock,
  Edit3,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ROMANTIC_BIO_PRESETS = [
  'In a love story written by the stars ✨',
  'Two souls, one heartbeat 💕',
  'Locked in your heart, forever and always 🔒',
  'Every moment with you is my favorite memory 🌹',
  'Building our little universe together 🌌'
];

const RELATIONSHIP_OPTIONS = [
  'In a soul bond ❤️',
  'Deeply in love 💖',
  'Engaged 💍',
  'Married 🌸',
  'Exclusive soulmates ✨',
  'Best friends & lovers 🧸'
];

const AVATAR_PRESETS = [
  'soul-heart-1',
  'soul-heart-2',
  'soul-heart-3',
  'soul-heart-4',
  'soul-heart-5',
  'soul-heart-6'
];

export default function AccountsPage() {
  const { user, profile, refreshProfile } = useAuth();

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [bio, setBio] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('In a soul bond ❤️');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setMobile(user.mobile || '');
      setAvatarUrl(user.avatarUrl || '');
      if (profile) {
        setBio(profile.bio || 'In a love story written by the stars ✨');
        setRelationshipStatus(profile.relationship_status || 'In a soul bond ❤️');
        setAnniversaryDate(profile.anniversary_date || '');
      }
    }
  }, [user, profile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await api.updateProfile(user.id, {
        displayName,
        username,
        mobile,
        bio,
        relationshipStatus,
        anniversaryDate,
        avatarUrl
      });
      await refreshProfile();
      setSuccessMsg('Profile updated and synchronized successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#08090e] overflow-y-auto overflow-x-hidden p-4 md:p-8 select-none max-w-full min-w-0">
      {/* Header */}
      <div className="mb-6 max-w-3xl mx-auto w-full">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          Account & Soul Profile <Sparkles className="w-5 h-5 text-rose-400" />
        </h1>
        <p className="text-xs text-slate-400">Manage your identity, security credentials, and romantic bond details</p>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6 pb-12">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Card Form */}
        <form onSubmit={handleSaveProfile} className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
          {/* Avatar Section & Banner */}
          <div className="relative rounded-2xl overflow-hidden p-6 bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-slate-900 border border-white/5">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group">
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id || 'GOSH'}`}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover border-3 border-rose-500/50 p-0.5 shadow-glow-pink bg-[#0f111a]"
                />
                <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <Camera className="w-5 h-5 text-white mb-1" />
                  <span className="text-[10px] text-white font-medium">Change</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold text-white">{displayName || 'Soul Member'}</h2>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" title="Verified Member" />
                </div>
                <p className="text-xs text-rose-300 font-mono mt-0.5">@{username || 'user'}</p>

                {/* ID Pill with Copy button */}
                <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-300">
                  <span className="text-slate-400 font-mono text-[10px]">ID:</span>
                  <span className="font-mono text-xs">{user?.id?.slice(0, 16)}...</span>
                  <button
                    type="button"
                    onClick={copyUserId}
                    className="text-slate-400 hover:text-white transition ml-1"
                    title="Copy full User ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Avatar Presets */}
            <div className="mt-5 pt-4 border-t border-white/5">
              <span className="text-[11px] text-slate-400 font-medium block mb-2">Avatar Presets:</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {AVATAR_PRESETS.map((seed) => {
                  const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-9 h-9 rounded-full overflow-hidden border transition flex-shrink-0 ${
                        avatarUrl === url ? 'border-rose-500 scale-110 shadow-glow-pink' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={url} alt={seed} className="w-full h-full object-cover bg-[#0f111a]" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username (Unique handle)</label>
              <div className="relative">
                <span className="text-xs font-semibold text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email (Firebase Auth)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-slate-400 focus:outline-none bg-black/40 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number (For login & calls)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Love Bio / Quote with Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Soul Bio & Romantic Status</label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="In a love story written by the stars ✨"
              className="w-full py-2.5 px-3 rounded-xl glass-input text-xs text-white focus:outline-none"
            />
            {/* Presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROMANTIC_BIO_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBio(preset)}
                  className="text-[10px] text-slate-400 hover:text-rose-300 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5 transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Romantic Bond & Anniversary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> Relationship Status
              </label>
              <select
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl glass-input text-xs text-white focus:outline-none bg-[#0f111a]"
              >
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#141724] text-white">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> Anniversary Date
              </label>
              <input
                type="date"
                value={anniversaryDate}
                onChange={(e) => setAnniversaryDate(e.target.value)}
                className="w-full py-2 px-3 rounded-xl glass-input text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl btn-romantic-primary text-xs font-semibold flex items-center gap-2 shadow-glow-pink"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>

        {/* Connected Devices & Sessions */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Laptop className="w-4 h-4 text-sky-400" /> Connected Devices & Sessions
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Laptop className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-semibold text-white">Current Browser Session</h4>
                  <p className="text-[11px] text-slate-400">Desktop / Web Client • Active Now</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                This Device
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-slate-400" />
                <div>
                  <h4 className="font-semibold text-white">Mobile Device (Capacitor App)</h4>
                  <p className="text-[11px] text-slate-400">Android / iOS App • Authenticated</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500">Authorized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}