import { useState, useEffect } from 'react';

const PWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showManualHint, setShowManualHint] = useState(false);

    useEffect(() => {
        // 1. Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // 2. Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        // 3. Listen for the native "Install" prompt from browser
        const handler = (e) => {
            console.log('✅ Browser is ready for one-click install!');
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('appinstalled', () => {
            console.log('🚀 App installed successfully as shortcut!');
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSPrompt(true);
            return;
        }

        // IF THE BROWSER IS READY (ONE CLICK INSTALL)
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        }
        // IF BROWSER IS NOT READY YET (FALLBACK TO MANUAL)
        else {
            setShowManualHint(true);
        }
    };

    // Don't show anything if already installed
    if (isInstalled) return null;

    return (
        <div className="w-full flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <button
                onClick={handleInstallClick}
                className="group relative flex items-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 px-8 py-4 rounded-[2rem] transition-all active:scale-95 overflow-hidden shadow-lg shadow-blue-500/5"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M12 2a1 1 0 011 1v10.586l2.293-2.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L11 13.586V3a1 1 0 011-1zM4 20a2 2 0 012-2h12a2 2 0 012 2v1H4v-1z" />
                    </svg>
                </div>

                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-widest text-white leading-none mb-1">Install Shortcut</p>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter opacity-80">
                        {deferredPrompt ? 'Add to Home Screen (1-Click)' : 'Get Native App Experience'}
                    </p>
                </div>
            </button>

            {/* Manual Install Hint for Desktop/Android */}
            {showManualHint && !isIOS && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-xs bg-[#0f172a] border border-blue-500/30 rounded-3xl p-6 text-center space-y-5 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)]">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-blue-500/20">
                            <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="font-black uppercase tracking-tight text-white text-lg">Manual Setup</h3>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Browser shortcut required</p>
                        </div>

                        <div className="text-left space-y-4 text-xs text-white/70 font-medium">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="font-bold text-white mb-1">On Laptop/Desktop:</p>
                                <p className="leading-relaxed">Check the <span className="text-blue-400 font-black">⊕ Install Icon</span> in your address bar (top right).</p>
                            </div>

                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="font-bold text-white mb-1">On Android:</p>
                                <p className="leading-relaxed">Tap <span className="text-blue-400 font-black">three dots (⋮)</span> then click <span className="text-blue-400 font-black">"Install App"</span>.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowManualHint(false)}
                            className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}

            {/* iOS Specific Instructions */}
            {showIOSPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-white">iPhone Shortcut</h3>
                        <p className="text-xs text-white/60 font-medium leading-relaxed">
                            Open in Safari and:
                        </p>
                        <div className="space-y-3 pt-2 text-left">
                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                                <p className="text-[11px] font-bold">Tap the <span className="text-blue-400">"Share"</span> button</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                                <p className="text-[11px] font-bold">Select <span className="text-blue-400">"Add to Home Screen"</span></p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowIOSPrompt(false)}
                            className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PWAInstall;
