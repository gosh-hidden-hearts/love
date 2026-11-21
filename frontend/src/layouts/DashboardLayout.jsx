import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageCircle, 
  CircleDot, 
  Phone, 
  Heart, 
  Settings, 
  User, 
  LogOut, 
  Sparkles, 
  Bell, 
  ShieldCheck, 
  Lock,
  Search,
  X,
  Volume2,
  Video,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  PhoneOff,
  ChevronRight,
  Flame,
  Award,
  SwitchCamera
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import InstallPWA from '../components/InstallPWA';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout, isVaultLocked } = useAuth();
  const { 
    callActive, 
    incomingCall, 
    callPartner, 
    callType, 
    callStatus,
    isMuted, 
    isVideoEnabled, 
    isScreenSharing, 
    callDuration,
    localVideoRef, 
    remoteVideoRef, 
    acceptCall, 
    rejectCall, 
    endCall, 
    toggleMute, 
    toggleVideo, 
    toggleCameraFacingMode,
    toggleScreenSharing 
  } = useCall();

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [statusRingActive, setStatusRingActive] = useState(true);

  // Format seconds into MM:SS
  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    {
      to: '/chats',
      icon: MessageCircle,
      label: 'Chats',
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      to: '/status',
      icon: CircleDot,
      label: 'Status',
      hasStoryRing: statusRingActive
    },
    {
      to: '/calls',
      icon: Phone,
      label: 'Calls'
    },
    {
      to: '/vault',
      icon: Heart,
      label: 'Memory Vault',
      isVault: true
    }
  ];

  return (
    <div className="flex h-screen w-screen bg-[#08090e] text-slate-100 overflow-hidden select-none">
      {/* =========================================================================
          DESKTOP SIDEBAR NAVIGATION (Hidden on mobile)
         ========================================================================= */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 bg-[#0f111a] border-r border-white/5 py-5 z-30 select-none">
        {/* Top: Brand Logo */}
        <div 
          className="flex flex-col items-center gap-1.5 cursor-pointer group" 
          onClick={() => navigate('/chats')}
          title="GOSH — Hidden Hearts"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-purple-600/20 to-pink-500/30 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-glow-pink group-hover:scale-105 transition-all duration-300">
            <Heart className="w-5 h-5 fill-rose-500 animate-pulse-slow" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-rose-400 font-mono">GOSH</span>
        </div>

        {/* Center: Main App Navigation Tabs */}
        <nav className="flex flex-col items-center gap-5 my-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group ${
                  isActive 
                    ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-glow-pink scale-105' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isVault && isActive ? 'fill-white' : ''}`} />

                {/* Left Active Glow Indicator Bar */}
                {isActive && (
                  <span className="absolute -left-3 w-1 h-6 bg-rose-500 rounded-r-full shadow-glow-pink" />
                )}

                {/* Unread badge */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0f111a]">
                    {item.badge}
                  </span>
                )}

                {/* Status ring indicator */}
                {item.hasStoryRing && !isActive && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}

                {/* Tooltip on hover */}
                <span className="absolute left-16 bg-[#141724] text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-glass">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom: Settings, Accounts & Profile Avatar */}
        <div className="flex flex-col items-center gap-3">
          <NavLink
            to="/settings"
            title="Settings"
            className={({ isActive }) => `w-10 h-10 rounded-xl flex items-center justify-center transition ${isActive ? 'text-rose-400 bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Settings className="w-5 h-5" />
          </NavLink>

          <NavLink
            to="/accounts"
            title="My Profile & Soul Space"
            className={({ isActive }) => `w-10 h-10 rounded-xl flex items-center justify-center transition ${isActive ? 'text-rose-400 bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <User className="w-5 h-5" />
          </NavLink>

          {/* User profile avatar thumbnail with online indicator */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDrawer(true)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-rose-500/40 hover:border-rose-400 transition-all hover:scale-105 active:scale-95"
              title="View Soul Profile"
            >
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id || 'GOSH'}`}
                alt={user?.displayName || 'User'}
                className="w-full h-full object-cover"
              />
            </button>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f111a]" />
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN APPLICATION VIEW AREA (Router Outlet + Mobile Top & Bottom Navigation)
         ========================================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Top Header (Visible only on small screens) */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 bg-[#0f111a]/95 backdrop-blur-md border-b border-white/5 z-30 select-none">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/chats')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500/20 to-purple-600/30 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Heart className="w-4 h-4 fill-rose-500 animate-pulse-slow" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide">GOSH</span>
              <span className="block text-[8px] uppercase tracking-wider text-rose-400 font-mono -mt-1">Hidden Hearts</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowProfileDrawer(true)}
              className="w-8 h-8 rounded-full overflow-hidden border border-rose-500/40"
              title="Profile"
            >
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id || 'GOSH'}`}
                alt={user?.displayName || 'User'}
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>

        {/* =========================================================================
            MOBILE BOTTOM NAVIGATION BAR (WhatsApp inspired, visible only on small screens)
           ========================================================================= */}
        <nav className="md:hidden flex items-center justify-around py-1.5 pb-safe min-h-[4rem] bg-[#0f111a]/95 backdrop-blur-md border-t border-white/5 px-2 z-40 select-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-all duration-200 ${
                  isActive ? 'text-rose-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${item.isVault && isActive ? 'fill-rose-400' : ''}`} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {item.hasStoryRing && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-semibold text-rose-300' : ''}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </main>

      {/* =========================================================================
          PROFILE QUICK DRAWER / SLIDE-OVER MODAL
         ========================================================================= */}
      {showProfileDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowProfileDrawer(false)} 
          />
          <div className="relative w-full max-w-sm h-full bg-[#0f111a] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span className="text-xs uppercase tracking-widest font-mono text-rose-400">Soul Profile</span>
                </div>
                <button
                  onClick={() => setShowProfileDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Card Summary */}
              <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 text-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-rose-600/30 via-purple-600/30 to-pink-600/30" />
                
                <div className="relative pt-4">
                  <div className="w-20 h-20 rounded-full mx-auto p-1 bg-gradient-to-tr from-rose-500 to-purple-500 shadow-glow-pink mb-3">
                    <img
                      src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id || 'GOSH'}`}
                      alt={user?.displayName || 'User'}
                      className="w-full h-full object-cover rounded-full bg-[#0f111a]"
                    />
                  </div>
                  <h3 className="text-base font-bold text-white">{user?.displayName || 'Soul User'}</h3>
                  <p className="text-xs text-rose-400 font-mono">@{user?.username || 'gosh_user'}</p>

                  <div className="mt-3 py-1.5 px-3 rounded-full bg-rose-500/10 border border-rose-500/20 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-rose-400" />
                    <span className="text-[11px] text-rose-300">{profile?.relationship_status || 'In a soul bond'}</span>
                  </div>

                  <p className="text-xs text-slate-400 italic mt-3 line-clamp-2">
                    "{profile?.bio || 'In a love story written by the stars ✨'}"
                  </p>
                </div>
              </div>

              {/* Quick Navigation Items */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowProfileDrawer(false);
                    navigate('/accounts');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white">Full Account & Soul Space</div>
                      <div className="text-[10px] text-slate-400">Edit profile, anniversary & bond details</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                </button>

                <button
                  onClick={() => {
                    setShowProfileDrawer(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white">Settings & Privacy Controls</div>
                      <div className="text-[10px] text-slate-400">Theme, notifications & security</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                </button>

                <button
                  onClick={() => {
                    setShowProfileDrawer(false);
                    navigate('/vault');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center text-pink-400">
                      <Heart className="w-4 h-4 fill-pink-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white">Memory Vault (MEGA Cloud)</div>
                      <div className="text-[10px] text-slate-400">20GB private encrypted memory space</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                </button>
              </div>
            </div>

            {/* Logout Footer */}
            <div className="pt-6 border-t border-white/5">
              <button
                onClick={logout}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of GOSH
              </button>
              <div className="text-center mt-3 text-[10px] text-slate-500">
                GOSH v1.0.0 • Hidden Hearts Romantic Platform
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INCOMING CALL MODAL (Ringing popup for WebRTC Audio/Video Calls)
         ========================================================================= */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-rose-500/30 text-center shadow-2xl animate-float">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
              <img
                src={incomingCall.callerAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${incomingCall.callerId}`}
                alt={incomingCall.callerName}
                className="w-24 h-24 rounded-full object-cover border-4 border-rose-500 relative z-10 shadow-glow-pink"
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{incomingCall.callerName}</h3>
            <p className="text-xs text-rose-300 uppercase tracking-widest mb-6 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Incoming {incomingCall.callType === 'video' ? 'Video Call' : 'Soul Audio Call'}...
            </p>

            {/* Accept / Decline Action Buttons */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition transform hover:scale-110 active:scale-95"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-glow-green transition transform hover:scale-110 active:scale-95"
                title="Accept"
              >
                {incomingCall.callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVE WEBRTC CALL OVERLAY (Full-screen / Floating Call Interface)
         ========================================================================= */}
      {callActive && (
        <div className="fixed inset-0 z-50 bg-[#08090e] flex flex-col justify-between p-4 md:p-8 animate-fadeIn">
          {/* Top Bar: Caller Info & Duration */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto z-10">
            <div className="flex items-center gap-3">
              <img
                src={callPartner?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${callPartner?.id}`}
                alt={callPartner?.displayName}
                className="w-12 h-12 rounded-full object-cover border border-rose-500/40"
              />
              <div>
                <h3 className="text-base font-semibold text-white">{callPartner?.displayName || 'Soul Connection'}</h3>
                <p className="text-xs text-rose-300 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {callStatus === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
                </p>
              </div>
            </div>

            {/* Call type badge */}
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-slate-300 font-medium capitalize">
              {callType} Call
            </span>
          </div>

          {/* Video Streams Container */}
          <div className="flex-1 w-full max-w-4xl mx-auto my-4 relative rounded-3xl overflow-hidden bg-slate-950/80 border border-white/10 flex items-center justify-center">
            {callType === 'video' ? (
              <>
                {/* Remote Video Stream (Main) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Local Video Stream (Picture-in-Picture) */}
                <div className="absolute bottom-4 right-4 w-32 h-44 md:w-44 md:h-60 rounded-2xl overflow-hidden border-2 border-rose-500/60 shadow-2xl bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                </div>
              </>
            ) : (
              /* Audio Only Call Graphic */
              <div className="text-center p-8">
                <div className="relative w-36 h-36 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-pulse" />
                  <img
                    src={callPartner?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${callPartner?.id}`}
                    alt={callPartner?.displayName}
                    className="w-36 h-36 rounded-full object-cover border-4 border-rose-500 shadow-glow-pink relative z-10"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{callPartner?.displayName}</h2>
                <p className="text-sm text-slate-400">GOSH Private Encrypted Audio Call</p>
              </div>
            )}
          </div>

          {/* Bottom Call Controls */}
          <div className="w-full max-w-md mx-auto flex items-center justify-center gap-4 py-4 z-10">
            {/* Mic Toggle */}
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full border transition ${
                isMuted 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Video Toggle (If video call) */}
            {callType === 'video' && (
              <>
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full border transition ${
                    !isVideoEnabled 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                      : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isVideoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {!isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>

                <button
                  onClick={toggleCameraFacingMode}
                  className="p-4 rounded-full border bg-white/10 border-white/10 text-white hover:bg-white/20 transition"
                  title="Switch Front / Rear Camera"
                >
                  <SwitchCamera className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Screen Sharing Toggle */}
            <button
              onClick={toggleScreenSharing}
              className={`p-4 rounded-full border transition ${
                isScreenSharing 
                  ? 'bg-emerald-500/30 border-emerald-500 text-emerald-400' 
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
              title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
            >
              <ScreenShare className="w-6 h-6" />
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-glow-pink transition transform hover:scale-105 active:scale-95"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Progressive Web App Android Install Banner */}
      <InstallPWA />
    </div>
  );
}