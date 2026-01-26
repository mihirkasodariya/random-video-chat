import React, { useState, useEffect, useRef } from 'react';

const Chat = ({ socket, isChatEnabled, clearChatTrigger, partnerId, messages, setMessages }) => {
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = ({ sender, message }) => {
            if (isChatEnabled) {
                setMessages(prev => [...prev, { text: message, isOwn: false }]);
            }
        };

        socket.on('chatMessage', handleChatMessage);

        return () => {
            socket.off('chatMessage', handleChatMessage);
        };
    }, [socket, isChatEnabled, setMessages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !isChatEnabled || !partnerId) return;

        socket.emit('chatMessage', { target: partnerId, message: newMessage.trim() });
        setMessages(prev => [...prev, { text: newMessage.trim(), isOwn: true }]);
        setNewMessage('');
    };

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex flex-col h-full bg-white text-gray-900 border-l border-gray-200 overflow-hidden">
            {/* Messages Area - Flexible space keeps input at the bottom */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-base font-sans bg-white min-h-0">
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
                                            <span className={`text-[13px] font-black uppercase tracking-tighter ${msg.isOwn ? 'text-blue-600' : 'text-red-600'}`}>
                                                {msg.isOwn ? 'You' : 'Stranger'}
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

            {/* Input Area - Redesigned for Desktop/Mobile distinction */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-[#FFF9F5] md:bg-white flex items-center gap-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-lg md:rounded-xl flex items-center px-3 md:px-4 py-2 md:py-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isChatEnabled ? (window.innerWidth < 768 ? "Send Message..." : "Type your message here...") : "Connecting..."}
                        disabled={!isChatEnabled}
                        className="flex-1 bg-transparent border-none outline-none text-base text-gray-800 placeholder-gray-400 font-medium"
                    />

                    {/* Mobile Only: Paper Plane Icon */}
                    <button
                        type="submit"
                        disabled={!isChatEnabled || !newMessage.trim()}
                        className="md:hidden ml-2 text-gray-300 hover:text-blue-500 disabled:opacity-30 transition-colors"
                    >
                        <svg className="w-6 h-6 rotate-45 transform" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>

                    {/* Desktop Only: Prominent Send Button */}
                    <button
                        type="submit"
                        disabled={!isChatEnabled || !newMessage.trim()}
                        className="hidden md:flex ml-2 px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        SEND
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
