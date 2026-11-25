import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(
    () => sessionStorage.getItem('gosh_pwa_banner_dismissed') === 'true'
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone display mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.__goshDeferredPrompt = e; // make globally accessible for SettingsPage
      console.log('[GOSH PWA] beforeinstallprompt event captured');
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__goshDeferredPrompt = null;
      console.log('[GOSH PWA] App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.__goshDeferredPrompt;

    if (promptEvent) {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      console.log('[GOSH PWA] User choice:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
      window.__goshDeferredPrompt = null;
    } else {
      // If prompt is not available, show guided Android Chrome installation steps
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('gosh_pwa_banner_dismissed', 'true');
  };

  // If already running standalone or installed, don't show the prompt banner
  if (isStandalone || isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Install Banner */}
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 max-w-[calc(100vw-2rem)] z-50 animate-fade-in-up">
        <div className="bg-[#0f111a]/95 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-4 shadow-2xl shadow-rose-950/40 relative overflow-hidden">
          {/* Subtle gradient glow */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-rose-500/40 shadow-glow-pink flex-shrink-0 bg-[#0c0d18]">
                <img src={logoImg} alt="GOSH App Icon" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold text-white tracking-wide">Install GOSH App</h4>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-300 rounded border border-rose-500/30 uppercase tracking-wider">
                    Android
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Fast, full-screen romantic experience without browser address bar.
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 relative z-10">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/25 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Now</span>
            </button>
            <button
              onClick={() => setShowInstructions(true)}
              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 flex items-center gap-1 transition-all"
            >
              <Info className="w-3.5 h-3.5 text-rose-400" />
              <span>How?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Android Chrome Step-by-Step Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#121420] border border-rose-500/30 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-rose-500/40 shadow-glow-pink flex-shrink-0 bg-[#0c0d18]">
                <img src={logoImg} alt="GOSH App Icon" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install on Android Chrome</h3>
                <p className="text-xs text-rose-300 font-mono">GOSH Progressive Web App</p>
              </div>
            </div>

            <div className="space-y-3.5 my-5 text-xs text-slate-300">
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  In Google Chrome, tap the <strong className="text-white">three dots menu (⋮)</strong> in the top-right corner.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Tap <strong className="text-white">"Install"</strong> in the popup confirmation dialog.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  4
                </span>
                <p>
                  Open <strong className="text-rose-400">GOSH</strong> from your home screen. It will open as a full-screen native Android app without any browser UI!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium text-xs hover:from-rose-600 hover:to-pink-700 transition-all"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
