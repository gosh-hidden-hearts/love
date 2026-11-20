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
  Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AccountsPage() {
  const { user, profile, refreshProfile } = useAuth();

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [bio, setBio] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('In a soul bond');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setMobile(user.mobile || '');
      setAvatarUrl(user.avatarUrl || '');
      if (profile) {
        setBio(profile.bio || 'In a love story written by the stars ✨');
        setRelationshipStatus(profile.relationship_status || 'In a soul bond');
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

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0c0d14] overflow-y-auto p-4 md:p-8 select-none">
      {/* Header */}
      <div className="mb-6 max-w-3xl mx-auto w-full">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          Account & Soul Profile <Sparkles className="w-5 h-5 text-rose-400" />
        </h1>
        <p className="text-xs text-slate-400">Manage your identity, security credentials, and romantic bond details</p>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6 pb-8">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Card Form */}
        <form onSubmit={handleSaveProfile} className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-white/5">
            <div className="relative group">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id}`}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-rose-500/40 p-0.5 shadow-glow-pink"
              />
              <label className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                <Camera className="w-5 h-5 text-white mb-1" />
                <span className="text-[10px] text-white">Change</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                {displayName || 'Soul Member'}
                <ShieldCheck className="w-4 h-4 text-emerald-400" title="Verified Member" />
              </h2>
              <p className="text-xs text-rose-300 font-mono">@{username || 'user'}</p>
              <p className="text-[11px] text-slate-400 mt-1">GOSH Account ID: <span className="font-mono text-slate-300">{user?.id?.slice(0, 18)}...</span></p>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email</label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number</label>
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

          {/* Love Bio */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Soul Bio / Status</label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="In a love story written by the stars ✨"
              className="w-full py-2.5 px-3 rounded-xl glass-input text-xs text-white focus:outline-none"
            />
          </div>

          {/* Romantic Bond & Anniversary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> Relationship Status
              </label>
              <input
                type="text"
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value)}
                placeholder="In a soul bond"
                className="w-full py-2.5 px-3 rounded-xl glass-input text-xs text-white focus:outline-none"
              />
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
          <div className="flex justify-end pt-4">
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
                  <p className="text-[11px] text-slate-400">Chrome on Windows • Active Now</p>
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
                  <h4 className="font-semibold text-white">Mobile Webview</h4>
                  <p className="text-[11px] text-slate-400">Android / iOS App • Last synced yesterday</p>
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
