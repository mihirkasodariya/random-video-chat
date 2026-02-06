import GoogleAd from './GoogleAd';

const InterstitialAd = ({ isOpen, onClose }) => {
    // We don't return null so the ad can pre-load in the background.
    // We only control visibility via CSS classes.
    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className={`relative w-full max-w-sm md:max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-10 text-center space-y-8 shadow-2xl transition-transform duration-500 ${isOpen ? 'scale-100' : 'scale-95'}`}>

                {/* Premium Background Glow */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-600/5 to-transparent rounded-[2.5rem] -z-10"></div>

                {/* Advertisement Header */}
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-3">
                        <span className="h-px w-6 bg-slate-800"></span>
                        <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.4em]">Advertisement</span>
                        <span className="h-px w-6 bg-slate-800"></span>
                    </div>
                </div>

                {/* Ad Container - Pre-loaded and styled like Home ads */}
                <div className="w-full flex justify-center py-2 relative z-10">
                    <div className="w-full max-w-[300px] h-[250px] bg-slate-800/40  border border-white/5 flex items-center justify-center overflow-hidden shadow-inner">
                        <GoogleAd
                            slotId="/6355419/Travel/Europe/France/Paris"
                            sizes={[[300, 250]]}
                            style={{ width: '300px', height: '250px' }}
                        />
                    </div>
                </div>

                {/* Subtext */}
                <p className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-none">Sponsored Content</p>

                {/* Action Button */}
                <div className="pt-2 relative z-10 space-y-6">
                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 shadow-inner"
                    >
                        Continue to Home
                    </button>

                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-relaxed">
                        Supporters help us keep video chats unlimited for everyone. Thank you!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InterstitialAd;
