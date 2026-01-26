import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500/30">
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

                {/* Sponsored Section */}
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Sponsored</p>
                    <div className="space-y-6">
                        {/* Sponsored Card 1 (Netflix Style) */}
                        <div className="bg-slate-800 rounded-lg overflow-hidden border border-white/5 shadow-lg group cursor-pointer hover:border-white/10 transition-colors">
                            <div className="h-48 bg-gradient-to-br from-black to-red-900 flex items-center justify-center relative overflow-hidden">
                                {/* Abstract N background */}
                                <div className="absolute inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-bcae-07a3f8dc141a/f6d7434e-d6de-4185-a6d4-c77a2d08737b/US-en-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg')] bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-500"></div>
                                <span className="text-9xl font-black text-red-600 drop-shadow-2xl relative z-10">N</span>
                            </div>
                            <div className="p-4 bg-slate-800">
                                <h3 className="font-bold text-white mb-1">Premium Video Chat</h3>
                                <p className="text-sm text-slate-400">Upgrade for ad-free experience and advanced features</p>
                            </div>
                        </div>

                        {/* Sponsored Card 2 (Digital Marketing Style) */}
                        <div className="bg-slate-800 rounded-lg overflow-hidden border border-white/5 shadow-lg group cursor-pointer hover:border-white/10 transition-colors">
                            <div className="h-48 bg-amber-100 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center group-hover:scale-105 transition-transform duration-500"></div>
                                <div className="absolute inset-0 bg-black/40"></div>
                                <div className="relative z-10 flex flex-wrap gap-1 px-8 justify-center">
                                    {['D', 'I', 'G', 'I', 'T', 'A', 'L'].map((char, i) => (
                                        <span key={i} className="bg-white/90 text-black font-bold w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded shadow-sm text-lg md:text-xl">{char}</span>
                                    ))}
                                </div>
                                <div className="relative z-10 flex flex-wrap gap-1 px-8 justify-center mt-2">
                                    {['M', 'A', 'R', 'K', 'E', 'T', 'I', 'N', 'G'].map((char, i) => (
                                        <span key={i} className="bg-white/90 text-black font-bold w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded shadow-sm text-lg md:text-xl">{char}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-800">
                                <h3 className="font-bold text-white mb-1">Connect Globally</h3>
                                <p className="text-sm text-slate-400">Meet people from over 150 countries</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;
