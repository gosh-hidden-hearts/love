import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Shield, Sparkles, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TermsModal, PrivacyModal } from '../components/TermsModal';

export default function AgreeContinuePage() {
  const navigate = useNavigate();
  const { user, acceptTerms } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAgreeAndContinue = async () => {
    setIsAccepting(true);
    try {
      await acceptTerms();
      if (user) {
        navigate('/chats', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error(err);
      if (user) {
        navigate('/chats', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full bg-[#0c0d14] flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-8 relative overflow-x-hidden text-slate-100 select-none">
      {/* Background glow effects strictly constrained to prevent horizontal scroll */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[500px] h-96 sm:h-[500px] bg-gradient-to-tr from-purple-900/20 via-rose-600/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header / Brand Title */}
      <div className="w-full text-center z-10 pt-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-wide text-white flex items-center justify-center gap-2">
          Welcome to <span className="text-romantic-gradient font-bold tracking-wider">GOSH</span>
        </h1>
        <p className="text-xs text-rose-300/80 tracking-widest uppercase mt-1">Glimpse Of Soul Hearts</p>
      </div>

      {/* Middle Illustration & Aesthetic Graphic */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 z-10 max-w-sm w-full">
        <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
          {/* Outer glowing pulsing circle */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500/10 via-purple-600/10 to-emerald-500/10 animate-pulse-slow border border-white/5" />
          
          {/* Inner constellation ring */}
          <div className="absolute w-52 h-52 rounded-full border border-dashed border-rose-400/20 animate-[spin_40s_linear_infinite]" />

          {/* Romantic Communication Vector Graphic */}
          <svg className="w-48 h-48 drop-shadow-[0_0_35px_rgba(244,63,94,0.35)]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Ambient Background Circles */}
            <circle cx="100" cy="100" r="85" fill="url(#paint0_radial)" fillOpacity="0.4" />
            
            {/* Connected Soul Hearts Constellation */}
            <path d="M60 100 C60 80, 85 75, 100 95 C115 75, 140 80, 140 100 C140 125, 100 155, 100 155 C100 155, 60 125, 60 100 Z" fill="url(#paint1_linear)" />
            <path d="M45 65 C45 52, 62 48, 72 62 C82 48, 99 52, 99 65 C99 82, 72 102, 72 102 C72 102, 45 82, 45 65 Z" fill="url(#paint2_linear)" fillOpacity="0.8" />
            
            {/* Communication waves */}
            <path d="M125 55 C145 65, 160 85, 165 110" stroke="#25d366" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
            <path d="M135 45 C160 58, 175 85, 180 115" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
            <path d="M25 85 C30 65, 45 50, 65 40" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />

            {/* Sparkles and star particles */}
            <circle cx="100" cy="40" r="3" fill="#fff" className="animate-ping" />
            <circle cx="160" cy="80" r="2.5" fill="#fde047" />
            <circle cx="40" cy="120" r="2.5" fill="#38bdf8" />
            <circle cx="150" cy="140" r="3" fill="#ec4899" />
            <circle cx="50" cy="50" r="2" fill="#fff" />

            {/* Chat bubble accent */}
            <rect x="110" y="70" width="36" height="24" rx="8" fill="#151724" stroke="rgba(244,63,94,0.4)" strokeWidth="1.5" />
            <path d="M118 78 H138 M118 84 H130" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />

            <defs>
              <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) rotate(90) scale(85)">
                <stop stopColor="#3b0764" stopOpacity="0.8"/>
                <stop offset="1" stopColor="#0c0d14" stopOpacity="0"/>
              </radialGradient>
              <linearGradient id="paint1_linear" x1="60" y1="75" x2="140" y2="155" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f43f5e"/>
                <stop offset="1" stopColor="#7e22ce"/>
              </linearGradient>
              <linearGradient id="paint2_linear" x1="45" y1="48" x2="99" y2="102" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fb7185"/>
                <stop offset="1" stopColor="#ec4899"/>
              </linearGradient>
            </defs>
          </svg>

          {/* Floating badge */}
          <div className="absolute -bottom-2 bg-slate-900/90 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-medium text-slate-200">A Private World for Two</span>
          </div>
        </div>

        {/* Catchphrase */}
        <p className="mt-8 text-center text-xs md:text-sm text-slate-400 max-w-xs leading-relaxed">
          Read our <button type="button" onClick={() => setShowPrivacy(true)} className="text-sky-400 hover:underline">Privacy Policy</button>. Tap &ldquo;Agree and continue&rdquo; to accept the <button type="button" onClick={() => setShowTerms(true)} className="text-sky-400 hover:underline">Terms of Service</button>.
        </p>
      </div>

      {/* Bottom Action Area (Exact WhatsApp Layout) */}
      <div className="w-full max-w-sm flex flex-col items-center space-y-5 z-10 pb-2">
        {/* AGREE AND CONTINUE Button */}
        <button
          onClick={handleAgreeAndContinue}
          disabled={isAccepting}
          className="w-full py-3.5 px-6 rounded-full btn-romantic-green font-semibold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-75"
        >
          {isAccepting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'AGREE AND CONTINUE'
          )}
        </button>

        {/* Language Selector Pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 cursor-pointer transition">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{selectedLanguage}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Modals for Terms and Privacy */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
