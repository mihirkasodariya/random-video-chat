const SafetyPolicy = ({ isOpen, onAccept }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-6 animate-in fade-in duration-300">
        
            <div className="w-full max-w-lg max-h-[90vh] bg-[#0d0d12] border border-white/10 rounded-[2rem] shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-300 flex flex-col">
                {/* Header Section */}
                <div className="sticky top-0 z-10 bg-[#0d0d12] px-6 md:px-8 py-5 md:py-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white leading-none mb-1.5">Safety Policy</h2>
                            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">videocall.mrgana.com</p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
                    <div className="space-y-5 text-white/70 text-sm md:text-base leading-relaxed text-left">
                        <p className="font-bold text-white text-[10px] md:text-xs uppercase tracking-wider opacity-90 border-l-2 border-blue-600 pl-3">Community Security Protocol:</p>

                        <div className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                                <span className="text-blue-500 text-[10px] font-black">01</span>
                            </div>
                            <p className="text-[13px] md:text-[15px]">
                                <strong className="text-white block mb-0.5">Strict Prohibition</strong> Any form of sexual activity, nudity, or obscene behavior is strictly prohibited. This is a clean communication environment.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                                <span className="text-blue-500 text-[10px] font-black">02</span>
                            </div>
                            <p className="text-[13px] md:text-[15px]">
                                <strong className="text-white block mb-0.5">Zero Tolerance</strong> videocall.mrgana.com does <span className="text-blue-400 font-bold">NOT</span> support or promote adult content. We maintain a high-standard community.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                                <span className="text-blue-500 text-[10px] font-black">03</span>
                            </div>
                            <p className="text-[13px] md:text-[15px]">
                                <strong className="text-white block mb-0.5">Permanent Ban</strong> Violators will be permanently blocked and device/IP information will be recorded for security blacklisting.
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                        <button
                            onClick={onAccept}
                            className="w-full py-4 md:py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-xs md:text-sm"
                        >
                            I Agree & Continue
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-1 opacity-50 pb-2">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">
                            Secure • Anonymous • Professional
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafetyPolicy;
