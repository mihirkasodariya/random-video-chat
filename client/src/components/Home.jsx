import React from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleAd from './GoogleAd';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="h-dvh w-full overflow-y-auto bg-slate-900 text-white font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">RandomChat</h1>
                        <p className="text-xs text-slate-400">Connect with random people around the world</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">

                {/* Sponsored Section */}
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Sponsored</p>
                    <div className="space-y-6">
                        {/* Sponsored Card 1 (Netflix Style) */}
                        {/* AdSense Unit 1 */}
                        <GoogleAd slotId="6300978111" style={{ height: '280px', background: '#f3f4f6', borderRadius: '8px' }} />

                        {/* Hero Card */}
                        <div className="bg-slate-800/50 rounded-lg p-8 md:p-12 text-center border border-white/5 shadow-xl">
                            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">Start a Random Video Chat</h2>
                            <p className="text-slate-400 mb-8 max-w-lg mx-auto">Click the button below to connect with a random stranger instantly</p>

                            <button
                                onClick={() => navigate('/random-connect')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-md transition-all duration-200 flex items-center gap-2 mx-auto active:scale-95 shadow-lg shadow-blue-600/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                                </svg>
                                Start Video Chat
                            </button>
                        </div>

                        {/* Sponsored Card 2 (Digital Marketing Style) */}
                        {/* AdSense Unit 2 */}
                        <GoogleAd slotId="6300978111" style={{ height: '280px', background: '#f3f4f6', borderRadius: '8px' }} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;
