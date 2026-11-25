import React from 'react';
import { X, ShieldCheck, Heart, FileText, Lock } from 'lucide-react';

export const TermsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-rose-500/20 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/40 to-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Terms of Service</h2>
              <p className="text-xs text-rose-300">GOSH — Glimpse Of Soul Hearts • Version 1.0.0</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed">
          <section>
            <h3 className="text-white font-medium mb-1 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" /> 1. Acceptance of Terms
            </h3>
            <p>
              By accessing or creating an account on GOSH (Glimpse Of Soul Hearts), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 2. Romantic & Private Communication
            </h3>
            <p>
              GOSH is designed as a sanctuary for romantic couples and private soul connections. You are responsible for maintaining the confidentiality of your account credentials and passcode vault PIN.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" /> 3. Memory Vault & Cloud Storage
            </h3>
            <p>
              Shared memories, media, and love notes stored within the Memory Vault are synchronized using encrypted private cloud storage. Only explicitly invited and authorized partners have access to your private vault spaces.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">4. Acceptable Use</h3>
            <p>
              You agree not to upload harmful content, spam, harass, or violate intellectual property rights. Respect and intimacy are the core values of GOSH.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">5. Modifications to Service</h3>
            <p>
              We continually enhance GOSH with new romantic features and privacy controls. Notice of significant policy updates will be displayed inside the application.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl btn-romantic-primary text-sm font-medium"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export const PrivacyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-emerald-500/20 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 to-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Privacy Policy</h2>
              <p className="text-xs text-emerald-300">GOSH Sanctuary • Zero Data Selling Guarantee</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed">
          <section>
            <h3 className="text-white font-medium mb-1">1. Information We Collect</h3>
            <p>
              We collect your email address, chosen username, display name, and optional mobile number strictly to facilitate authentication, contact discovery, and account recovery.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">2. Messaging & Calling Privacy</h3>
            <p>
              Your real-time conversations, voice memos, and WebRTC audio/video calls are private. WebRTC audio and video streams flow directly peer-to-peer using encrypted channels.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">3. Shared Memory Vault Security</h3>
            <p>
              Media uploaded to the Memory Vault is stored on private encrypted cloud infrastructure. Metadata is restricted to verified members of that couple connection.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">4. Passcode Vault Protection</h3>
            <p>
              Your Passcode Vault PIN is hashed on your device and never stored in plain text. Private moments remain accessible only to you.
            </p>
          </section>

          <section>
            <h3 className="text-white font-medium mb-1">5. Account Deletion</h3>
            <p>
              You have the right to permanently delete your account, conversations, and uploaded memories at any time from the Accounts settings page.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl btn-romantic-green text-sm font-medium"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
