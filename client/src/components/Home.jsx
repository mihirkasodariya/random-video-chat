import { useNavigate } from 'react-router-dom';
import GoogleAd from './GoogleAd';
import Layout from './Layout';
import PWAInstall from './PWAInstall';

const Home = () => {
    const navigate = useNavigate();

    const handleStartChat = () => {
        const isVerified = localStorage.getItem("ageVerified");

        if (isVerified === "true") {
            navigate('/random-connect');
        } else {
            navigate('/age-verification');
        }
    };

    return (
        <Layout>
            <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6 w-full">
                {/* Hero Card */}
                <div className="w-full max-w-sm bg-slate-800 p-4 md:p-10 rounded-2xl shadow-2xl border border-white/5 text-center space-y-8 relative z-10 shrink-0">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">Meet New Friends</h2>
                        <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                            Instant video chats with new people.
                        </p>
                        <div className='mt-4'>
                            <button
                                onClick={handleStartChat}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 md:py-5 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-blue-600/20 text-lg md:text-xl"
                            >
                                Start Video Chat
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-50">
                            <span>•</span>
                            <span>Free</span>
                            <span>•</span>
                            <span>Anonymous</span>
                            <span>•</span>
                            <span>Secure</span>
                        </div>
                    </div>
                </div>

                {/* PWA Install Button */}
                <PWAInstall />

                {/* Bottom Ad Slot */}
                <div className="w-full max-w-sm bg-slate-800/40 rounded-2xl border border-white/5 py-4 flex flex-col items-center gap-3 shrink-0">
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest leading-none">Advertisement</p>
                    <div className="w-full flex justify-center overflow-hidden">
                        <GoogleAd
                            slotId="/6355419/Travel/Europe/France/Paris"
                            width={300}
                            height={250}
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Home;
