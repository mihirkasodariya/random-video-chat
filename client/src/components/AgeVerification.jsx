import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleAd from './GoogleAd';

const AgeVerification = () => {
    const navigate = useNavigate();
    const [showTopAd, setShowTopAd] = useState(true);
    const [showBottomAd, setShowBottomAd] = useState(true);

    useEffect(() => {
        // Double check if already verified, if so, skip this page
        const isVerified = localStorage.getItem("ageVerified");
        if (isVerified === "true") {
            navigate('/random-connect');
        }
    }, [navigate]);

    const handleUnder18 = () => {
        navigate('/');
    };

    const handleOver18 = () => {
        localStorage.setItem("ageVerified", "true");
        navigate('/random-connect');
    };

    return (
        <div className="min-h-screen w-full flex flex-col bg-slate-900 text-white font-sans overflow-hidden">

            {/* --- TOP AD SECTION --- */}
            <div className={`w-full bg-slate-800/50 border-b border-white/5 relative transition-all duration-300 ease-in-out shrink-0 flex flex-col items-center overflow-hidden ${showTopAd ? 'opacity-100' : 'opacity-0'}`}
                style={{ maxHeight: showTopAd ? '100px' : '0px' }}>
                <div className="w-full flex justify-center">
                    <GoogleAd
                        clientId="ca-pub-3940256099942544"
                        slotId="6300978111"
                        style={{ width: '100%', height: '90px', background: 'transparent' }}
                    />
                </div>
            </div>
            {/* Top Toggle Button */}
            <div className="w-full flex justify-center -mt-[1px] z-20">
                <button
                    onClick={() => setShowTopAd(!showTopAd)}
                    className="bg-slate-800 border-x border-b border-white/20 text-slate-400 text-[10px] px-3 py-0.5 rounded-b shadow-md hover:text-white hover:bg-slate-700 transition-colors uppercase font-bold tracking-widest leading-none flex items-center gap-1"
                >
                    {showTopAd ? <>Hide <span className="text-[8px]">▲</span></> : <>Ad <span className="text-[8px]">▼</span></>}
                </button>
            </div>


            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col items-center justify-center w-full p-4 min-h-0 overflow-y-auto">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-white/5 text-center space-y-8 relative z-10 shrink-0">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-white">Select Age</h1>
                        <p className="text-slate-400 text-sm">You must be 18 or older to use this random video chat service.</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleOver18}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-lg"
                        >
                            18+
                        </button>

                        <button
                            onClick={handleUnder18}
                            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white/80 font-semibold rounded-xl transition-all border border-white/5 active:scale-95"
                        >
                            Under 18
                        </button>
                    </div>

                    <p className="text-[10px] text-slate-500 uppercase tracking-widest pt-4">
                        Safety & Policy Check
                    </p>
                </div>
            </div>


            {/* --- BOTTOM AD SECTION --- */}
            {/* Bottom Toggle Button */}
            <div className="w-full flex justify-center -mb-[1px] z-20">
                <button
                    onClick={() => setShowBottomAd(!showBottomAd)}
                    className="bg-slate-800 border-x border-t border-white/20 text-slate-400 text-[10px] px-3 py-0.5 rounded-t shadow-md hover:text-white hover:bg-slate-700 transition-colors uppercase font-bold tracking-widest leading-none flex items-center gap-1"
                >
                    {showBottomAd ? <>Hide <span className="text-[8px]">▼</span></> : <>Ad <span className="text-[8px]">▲</span></>}
                </button>
            </div>
            {/* Bottom Ad Container */}
            <div className={`w-full bg-slate-800/50 border-t border-white/5 relative transition-all duration-300 ease-in-out shrink-0 flex flex-col items-center overflow-hidden ${showBottomAd ? 'opacity-100' : 'opacity-0'}`}
                style={{ maxHeight: showBottomAd ? '100px' : '0px' }}>
                <div className="w-full flex justify-center">
                    <GoogleAd
                        clientId="ca-pub-3940256099942544"
                        slotId="6300978111"
                        style={{ width: '100%', height: '90px', background: 'transparent' }}
                    />
                </div>
            </div>

        </div>
    );
};

export default AgeVerification;
