import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleAd from './GoogleAd';

const AgeVerification = () => {
    const navigate = useNavigate();

    useEffect(() => {
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
        <div className="min-h-screen w-full flex flex-col bg-slate-900 text-white font-sans overflow-x-hidden">

            {/* Main Wrapper to center everything and keep width consistent */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">

                {/* Top Ad Slot - Exactly same width as Card */}
                <div className="w-full max-w-sm bg-slate-800/40 rounded-2xl border border-white/5 py-4 flex flex-col items-center gap-2 shrink-0">
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest leading-none">Advertisement</p>
                    <div className="w-full flex justify-center overflow-hidden">
                        <GoogleAd
                            slotId="/6355419/Travel/Europe/France/Paris"
                            width={320}
                            height={50}
                        />
                    </div>
                </div>

                {/* Age Selection Card */}
                <div className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl shadow-2xl border border-white/5 text-center space-y-8 relative z-10 shrink-0">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">Select Age</h1>
                        <p className="text-slate-400 text-sm font-medium">You must be 18 or older to use this random video chat service.</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleOver18}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-xl"
                        >
                            18+
                        </button>

                        <button
                            onClick={handleUnder18}
                            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white/80 font-semibold rounded-xl transition-all border border-white/5 active:scale-95"
                        >
                            Under 18
                        </button>

                        <p className="text-[10px] text-slate-500 uppercase tracking-widest pt-4 opacity-50">
                            Safety & Policy Check
                        </p>
                    </div>
                    <p> Lorem, ipsum dolor sit amet consectetur adipisicing elit. At atque laborum, esse in iusto temporibus quisquam dolorem ea inventore dolorum nisi ab ullam cum molestias aperiam cupiditate illum neque soluta. Lorem ipsum dolor sit amet consectetur adipisicing elit. Pariatur, quis ut voluptas numquam iusto consequatur debitis architecto in optio porro est distinctio aut delectus natus laboriosam reiciendis culpa qui illo.Lorem ipsum dolor sit amet consectetur adipisicing elit. Sequi ratione id, repudiandae, ab recusandae, esse saepe nisi labore nihil veniam officiis atque doloremque expedita voluptatem totam possimus quod quo accusantium?</p>
                </div>
            </div>

        </div>
    );
};

export default AgeVerification;
