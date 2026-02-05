import { useState, useEffect, useRef } from 'react';

const Chat = ({ socket, isChatEnabled, clearChatTrigger, partnerId, messages, setMessages, hideHistory = false }) => {
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        if (!partnerId) {
            console.error("DEBUG: Message failed - No partnerId present.");
            return;
        }

        console.log(`DEBUG: Sending to ${partnerId}: ${newMessage}`);
        socket.emit('chatMessage', { target: partnerId, message: newMessage.trim() });
        setMessages(prev => [...prev, { text: newMessage.trim(), isOwn: true }]);
        setNewMessage('');
    };

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className={`flex flex-col ${hideHistory ? '' : 'h-full'} bg-transparent md:bg-white text-gray-900 md:text-gray-900 md:border-l border-white/10 md:border-gray-200 overflow-hidden`}>
            <style>{`
                input::placeholder { color: rgba(255,255,255,0.4); }
                .md-chat input::placeholder { color: rgba(0,0,0,0.4); }
            `}</style>
            {/* Messages Area - Flexible space keeps input at the bottom */}
            {!hideHistory && (
                <div className="flex-1 overflow-y-auto space-y-2 text-base font-sans bg-transparent md:bg-white min-h-0">
                    <div className="hidden md:block">
                        {!isChatEnabled ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6">
                                <p className="text-gray-400">Looking for someone new...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="hidden md:block my-2 text-gray-500 font-bold mb-4 text-center">
                                You're now chatting with a random stranger. Say hi!
                            </div>
                        ) : (
                            // Keep messages intact
                            <>
                                <div className="flex flex-col space-y-3">
                                    <div className="hidden md:block py-2 px-3 bg-blue-50/50 rounded-md border border-blue-100/50 text-blue-700 font-bold text-xs uppercase tracking-tight mb-2 text-center">
                                        You're now chatting with a random stranger. Say hi!
                                    </div>
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col ${msg.isOwn ? 'items-start' : 'items-start'}`}>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-[13px] pl-2 font-black uppercase tracking-tighter ${msg.isOwn ? 'text-blue-600' : 'text-red-600'}`}>
                                                    {msg.isOwn ? 'You : ' : 'Stranger : '}
                                                </span>
                                                <span className="text-[15px] leading-relaxed text-gray-800 font-medium">
                                                    {msg.text}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            )}

            {/* Input Area - Pure Overlay on Mobile */}
            <form onSubmit={handleSendMessage} className="p-3 bg-transparent md:bg-white flex items-center gap-2">
                <div className="flex-1 bg-black/30 md:bg-white border border-white/10 md:border-gray-200 rounded-2xl md:rounded-xl flex items-center px-4 md:px-4 py-2 md:py-2.5 shadow-2xl transition-all">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isChatEnabled ? (window.innerWidth < 768 ? "Send Message..." : "Type your message here...") : "Connecting..."}
                        disabled={!isChatEnabled}
                        className="flex-1 bg-transparent border-none outline-none text-base text-white md:text-gray-800 placeholder-white/40 md:placeholder-gray-400"
                    />

                    {/* Modern Send Icon - Visible on all platforms */}
                    <button
                        type="submit"
                        disabled={!isChatEnabled || !newMessage.trim()}
                        className="ml-2 flex items-center justify-center p-1.5 md:p-2 bg-blue-600 md:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all active:scale-90 disabled:opacity-40 disabled:grayscale"
                    >
                        <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
