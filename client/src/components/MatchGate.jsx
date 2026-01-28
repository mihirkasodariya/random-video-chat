import React from 'react';

const MatchGate = ({ isOpen, onClose, onClaim }) => {
    if (!isOpen) return null;

    const avatars = [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=150&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-[scale-in_0.3s_ease-out_forwards] text-center p-6">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Header */}
                <h2 className="text-xl font-bold text-slate-900 mb-6">Free Match</h2>

                {/* Avatars */}
                <div className="flex justify-center -space-x-4 mb-6">
                    {avatars.map((src, i) => (
                        <div key={i} className="w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-md relative z-0 hover:z-10 transition-transform hover:scale-110">
                            <img src={src} alt="User" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>

                {/* Message */}
                <p className="text-slate-600 mb-8 font-medium px-4">
                    Unlock <span className="text-amber-500 font-bold">ALL GIRLS</span> Match Filter Privilege!
                </p>

                {/* CTA */}
                <button
                    onClick={onClaim}
                    className="w-full bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-full shadow-lg shadow-cyan-400/30 transition-all active:scale-95 text-lg"
                >
                    Claim
                </button>
            </div>
        </div>
    );
};

export default MatchGate;
