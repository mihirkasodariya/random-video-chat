import React from 'react';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen w-full bg-slate-900 text-white font-sans overflow-x-hidden flex flex-col pb-6 md:pb-0">
            {/* Header */}
            <header className="w-full px-6 py-2 flex items-center justify-center md:justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="flex items-center gap-3 transition-all duration-300 hover:opacity-90"
                    >
                        <h1
                            className="
    text-xl font-extrabold tracking-tight
    bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600
    bg-clip-text text-transparent
  "
                            style={{
                                fontFamily: "'Poppins', system-ui, sans-serif",
                                letterSpacing: "-0.01em",
                                animation: "gradientMove 6s ease infinite",
                                backgroundPosition: "0% 50%"
                            }}
                        >
                            Mrgana Video Call
                        </h1>


                        <style>{`
    @keyframes gradientMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `}</style>
                    </Link>

                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center">
                {children}
            </main>

            {/* Footer */}
            <footer className="w-full py-4 px-2 border-t border-white/5 bg-slate-900/50 backdrop-blur-md shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] md:text-sm font-medium text-white tracking-widest">
                        <Link to="/terms" className="hover:text-blue-500 transition-colors whitespace-nowrap">• Terms of Service</Link>
                        <Link to="/privacy" className="hover:text-blue-500 transition-colors whitespace-nowrap">• Privacy Policy</Link>
                        <Link to="/guidelines" className="hover:text-blue-500 transition-colors whitespace-nowrap">• Community Guidelines</Link>
                    </div>

                    <p className="text-[10px] md:text-sm text-white font-medium tracking-[0.1em] text-center">
                        © 2026 Mrgana Video Call
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
