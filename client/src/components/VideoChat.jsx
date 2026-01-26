import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { loadModel, checkImage, isUnsafe } from '../utils/safety';

import MatchGate from './MatchGate';
import Chat from './Chat';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        ...(import.meta.env.VITE_TURN_URL ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
        }] : []),
    ],
};

const VideoChat = () => {
    const navigate = useNavigate();
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, waiting, matched
    const [isLocalUnsafe, setIsLocalUnsafe] = useState(false);
    const [isRemoteUnsafe, setIsRemoteUnsafe] = useState(false);
    const [matchedPartnerId, setMatchedPartnerId] = useState(null);

    // Initial Media State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // Partner Media State
    const [partnerMuted, setPartnerMuted] = useState(false);
    const [partnerVideoOff, setPartnerVideoOff] = useState(false);

    // Gate & Ad State
    const [nextClickCount, setNextClickCount] = useState(0);
    const [showGate, setShowGate] = useState(false);
    const [isAdPlaying, setIsAdPlaying] = useState(false);

    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const peerRef = useRef();
    const socketRef = useRef();
    const partnerIdRef = useRef();
    const hasJoinedRef = useRef(false);
    const candidatesQueue = useRef([]);
    const signalsQueue = useRef([]);

    // Chat state
    const [messages, setMessages] = useState([]);
    const [isChatEnabled, setIsChatEnabled] = useState(false);
    const [chatClearTrigger, setChatClearTrigger] = useState(0);
    const [showChat, setShowChat] = useState(false); // New state for mobile toggle

    useEffect(() => {
        setupCamera();

        // Load Safety Model
        loadModel().then(loaded => {
            if (loaded) console.log("NSFW Model loaded");
        });

        const newSocket = io('/');
        setSocket(newSocket);
        socketRef.current = newSocket;

        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            newSocket.disconnect();
        };
    }, []);

    const setupCamera = async (mode = 'user') => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                audio: true,
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            setFacingMode(mode);

            newStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            newStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = newStream;
            }

            if (peerRef.current) {
                const senders = peerRef.current.getSenders();
                const videoTrack = newStream.getVideoTracks()[0];
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) videoSender.replaceTrack(videoTrack);

                const audioTrack = newStream.getAudioTracks()[0];
                const audioSender = senders.find(s => s.track?.kind === 'audio');
                if (audioSender) audioSender.replaceTrack(audioTrack);
            }

        } catch (err) {
            console.error("Error accessing media", err);
            setError("Camera access denied or not found.");
        }
    };

    useEffect(() => {
        if (localVideoRef.current && stream) {
            if (localVideoRef.current.srcObject !== stream) {
                localVideoRef.current.srcObject = stream;
            }
        }
    }, [stream, isVideoOff, isLocalUnsafe]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream && !partnerVideoOff) {
            console.log("Attaching remote stream to video element");
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, partnerVideoOff]);

    const handleSignal = async (sender, signal) => {
        try {
            if (!peerRef.current) {
                signalsQueue.current.push({ sender, signal });
                return;
            }

            if (signal.type === 'offer') {
                console.log("Processing offer from", sender);
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peerRef.current.createAnswer();
                await peerRef.current.setLocalDescription(answer);
                socketRef.current.emit('signal', { target: sender, signal: answer });
            } else if (signal.type === 'answer') {
                console.log("Processing answer from", sender);
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                console.log("Adding ICE candidate from", sender);
                try {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (e) {
                    console.error("Error adding candidate", e);
                }
            }
        } catch (err) {
            console.error("Signaling error:", err);
        }
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('match', async ({ initiator, roomId, partnerId }) => {
            console.log("Matched with", partnerId, "Initiator:", initiator);

            // Critical: Set ID first
            partnerIdRef.current = partnerId;
            setMatchedPartnerId(partnerId);
            setIsChatEnabled(true);

            setStatus('matched');
            candidatesQueue.current = []; // Clear queue on match
            signalsQueue.current = []; // Clear early signals
            setMessages([]); // Clear chat state
            initializePeer(initiator, partnerId);

            // Process any signals that arrived early
            while (signalsQueue.current.length > 0) {
                const { sender, signal } = signalsQueue.current.shift();
                handleSignal(sender, signal);
            }

            setPartnerMuted(false);
            setPartnerVideoOff(false);

            setChatClearTrigger(prev => prev + 1);

            if (window.innerWidth < 768) {
                setShowChat(false);
            }

            socket.emit('mediaState', {
                target: partnerId,
                isMuted,
                isVideoOff
            });
        });

        socket.on('signal', async ({ sender, signal }) => {
            handleSignal(sender, signal);
        });

        socket.on('mediaState', ({ sender, isMuted: remoteMuted, isVideoOff: remoteVideoOff }) => {
            if (sender === partnerIdRef.current) {
                setPartnerMuted(remoteMuted);
                setPartnerVideoOff(remoteVideoOff);
            }
        });

        socket.on('partnerDisconnected', () => {
            console.log("Partner disconnected, searching for next...");
            setMatchedPartnerId(null);
            setMessages([]);
            if (!showGate && !isAdPlaying) {
                handleNext();
            } else {
                setIsChatEnabled(false);
                setChatClearTrigger(prev => prev + 1);
            }
        });

        return () => {
            socket.off('match');
            socket.off('signal');
            socket.off('mediaState');
            socket.off('partnerDisconnected');
        };
    }, [socket, stream, showGate, isAdPlaying, isMuted, isVideoOff]);

    // Stable Chat Listener
    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = ({ sender, message }) => {
            console.log("[STABLE RECEIVE] ", { sender, message });
            setMessages(prev => [...prev, { text: message, isOwn: false }]);
        };

        socket.on('chatMessage', handleChatMessage);

        return () => {
            socket.off('chatMessage', handleChatMessage);
        };
    }, [socket]);

    const initializePeer = (initiator, partnerId) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerRef.current = pc;

        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('signal', { target: partnerId, signal: { candidate: event.candidate } });
            }
        };

        pc.ontrack = (event) => {
            console.log("Received remote track:", event.streams[0]);
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                if (!showGate && !isAdPlaying) {
                    handleNext();
                }
            }
        };

        if (initiator) {
            console.log("Creating offer as initiator...");
            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
                socketRef.current.emit('signal', { target: partnerId, signal: offer });
            });
        }
    };

    const handleNext = () => {
        if (showGate || isAdPlaying) return;

        const newCount = nextClickCount + 1;
        setNextClickCount(newCount);

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        setRemoteStream(null);
        setMatchedPartnerId(null);
        setMessages([]);
        setStatus('waiting');
        setIsRemoteUnsafe(false);
        setPartnerMuted(false);
        setPartnerVideoOff(false);
        setIsChatEnabled(false);
        setChatClearTrigger(prev => prev + 1);
        setShowChat(false); // Close chat on next

        socketRef.current.emit('next');

        if (newCount > 5) {
            setShowGate(true);
            setStatus('idle');
            hasJoinedRef.current = false;
            return;
        }

        hasJoinedRef.current = false;
        joinQueue();
    };

    const handleClaim = () => {
        setShowGate(false);
        setIsAdPlaying(true);
        setTimeout(() => {
            setIsAdPlaying(false);
            setNextClickCount(0);
            joinQueue();
        }, 3000);
    };

    const handleGateClose = () => {
        setShowGate(false);
    };

    const handleEndCall = () => {
        if (peerRef.current) peerRef.current.close();
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (socketRef.current) socketRef.current.disconnect();
        navigate('/');
    };

    const joinQueue = () => {
        if (hasJoinedRef.current) return;
        setStatus('waiting');
        socketRef.current.emit('join');
        hasJoinedRef.current = true;
    };

    useEffect(() => {
        if (stream && socket && !showGate && !isAdPlaying && nextClickCount <= 5) {
            joinQueue();
        }
    }, [stream, socket]);

    // Safety Check Loop
    useEffect(() => {
        const interval = setInterval(async () => {
            if (localVideoRef.current && stream && !isVideoOff) {
                const predictions = await checkImage(localVideoRef.current);
                setIsLocalUnsafe(isUnsafe(predictions));
            }
            if (remoteVideoRef.current && remoteStream && !partnerVideoOff) {
                const predictions = await checkImage(remoteVideoRef.current);
                setIsRemoteUnsafe(isUnsafe(predictions));
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [stream, remoteStream, isVideoOff, partnerVideoOff]);

    const toggleAudio = () => {
        if (stream) {
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            stream.getAudioTracks().forEach(track => track.enabled = !newMutedState);
            if (partnerIdRef.current) {
                socketRef.current.emit('mediaState', {
                    target: partnerIdRef.current,
                    isMuted: newMutedState,
                    isVideoOff
                });
            }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const newVideoState = !isVideoOff;
            setIsVideoOff(newVideoState);
            stream.getVideoTracks().forEach(track => track.enabled = !newVideoState);
            if (partnerIdRef.current) {
                socketRef.current.emit('mediaState', {
                    target: partnerIdRef.current,
                    isMuted,
                    isVideoOff: newVideoState
                });
            }
        }
    };

    const handleRemoveMessage = (index) => {
        setMessages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col h-dvh w-full bg-black md:bg-white overflow-hidden text-gray-900 font-sans">
            <MatchGate isOpen={showGate} onClose={handleGateClose} onClaim={handleClaim} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-black md:bg-white relative">

                {/* Video Area (Stacked on Mobile, Side-by-Side on Desktop) */}
                <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 bg-black relative">

                    {/* Desktop Floating Controls Overlay */}
                    <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-30 items-center gap-4 px-6 py-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                        <button
                            onClick={handleEndCall}
                            className="px-6 py-2.5 bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-lg uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                        >
                            Stop
                        </button>

                        <div className="flex gap-3 px-4 border-l border-r border-white/10">
                            <button onClick={toggleAudio} className={`p-2.5 rounded-full transition-all ${isMuted ? 'bg-red-500/80 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                {isMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                )}
                            </button>
                            <button onClick={toggleVideo} className={`p-2.5 rounded-full transition-all ${isVideoOff ? 'bg-red-500/80 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                {isVideoOff ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleNext}
                            className="px-8 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                        >
                            Next
                        </button>
                    </div>

                    {/* Stranger Video */}
                    <div className="flex-1 h-1/2 md:h-full relative overflow-hidden flex items-center justify-center">
                        {remoteStream && !partnerVideoOff ? (
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                                {status === 'waiting' ? 'Looking for partner...' : 'Waiting for connection...'}
                            </div>
                        )}
                        {isRemoteUnsafe && (
                            <div className="absolute inset-0 bg-gray-950/90 z-10 backdrop-blur-md flex items-center justify-center">
                                <p className="text-center text-red-400 font-bold uppercase tracking-tighter max-w-[200px]">Safety Filter: Content Hidden</p>
                            </div>
                        )}

                        <div className="md:hidden absolute top-4 left-4 text-black text-[9px] font-bold uppercase tracking-widest drop-shadow-md z-20 opacity-80">Stranger</div>

                        {/* Mobile Floating Media Controls */}
                        <div className="md:hidden absolute top-[15%] -translate-y-1/2 right-4 z-30 flex flex-col gap-3">
                            <button onClick={toggleAudio} className={`p-2.5 rounded-xl border border-white/10 transition-all ${isMuted ? 'bg-red-500/80 text-white shadow-lg' : 'bg-black/40 text-white hover:bg-black/50'}`}>
                                {isMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                )}
                            </button>
                            <button onClick={toggleVideo} className={`p-2.5 rounded-xl border border-white/10 transition-all ${isVideoOff ? 'bg-red-500/80 text-white shadow-lg' : 'bg-black/40 text-white hover:bg-black/50'}`}>
                                {isVideoOff ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Local Video (You) */}
                    <div className="flex-1 h-1/2 md:h-full relative overflow-hidden flex items-center justify-center bg-gray-900">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {(isVideoOff || isLocalUnsafe) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 z-20 backdrop-blur-sm">
                                <div className="text-4xl mb-2 opacity-30 text-white font-bold uppercase tracking-widest">You</div>
                                <div className="px-4 py-1.5 bg-red-600/20 border border-red-500/50 rounded-full">
                                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-center">
                                        {isLocalUnsafe ? 'Safety Filter Active' : 'Camera Off'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Mobile Overlays at the bottom */}
                        <div className="md:hidden absolute bottom-2 left-2 right-2 flex flex-col gap-1.5 z-40">
                            {/* Floating Messages */}
                            {messages.slice(-3).map((msg, idx) => {
                                // Calculate actual index in the messages array
                                const actualIndex = messages.length - messages.slice(-3).length + idx;
                                return (
                                    <div key={actualIndex} className="group w-fit max-w-[85%] relative bg-black/30 p-2.5 pr-9 rounded-xl text-white text-[12px] leading-snug border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <span className={`font-black uppercase tracking-tighter mr-1.5 ${msg.isOwn ? 'text-blue-400' : 'text-red-400'}`}>
                                            {msg.isOwn ? 'You: ' : 'Stranger: '}
                                        </span>
                                        <span className="opacity-95">{msg.text}</span>
                                        <button
                                            onClick={() => handleRemoveMessage(actualIndex)}
                                            className="absolute right-1.5 top-1.5 text-white/40 hover:text-white p-1 transition-colors"
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}

                            {/* {messages.length === 0 && (
                                <div className="bg-black/60 p-3 rounded-xl text-white text-[10px] leading-snug border border-white/10 shadow-lg">
                                    Meet a person - Engage in a respectful and friendly chat! 🌐📸
                                </div>
                            )} */}

                            {/* Mobile Chat Input - Pinned ABOVE action buttons */}
                            <div className="bg-transparent">
                                <Chat
                                    socket={socket}
                                    isChatEnabled={isChatEnabled}
                                    clearChatTrigger={chatClearTrigger}
                                    partnerId={matchedPartnerId}
                                    messages={messages}
                                    setMessages={setMessages}
                                    onRemoveMessage={handleRemoveMessage}
                                    hideHistory={true}
                                />
                            </div>

                            {/* Mobile STOP/NEXT Buttons - Absolute bottom and compact */}
                            <div className="flex px-0 pb-2 pt-0.5 gap-2 bg-transparent">
                                <button
                                    onClick={handleEndCall}
                                    className="flex-1 py-2.5 bg-slate-900/90 text-white font-bold text-[9px] rounded-lg shadow-lg uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                                >
                                    STOP
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="flex-1 py-2.5 bg-blue-600/90 text-white font-bold text-[9px] rounded-lg shadow-lg uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                                >
                                    NEXT
                                </button>
                            </div>
                        </div>

                        <div className="md:hidden absolute top-4 left-4 text-black text-[9px] font-bold uppercase tracking-widest drop-shadow-md z-20 opacity-80">You</div>
                    </div>
                </div>

                {/* Right Segment: Desktop Side-Chat only */}
                <div className="hidden md:flex md:w-[350px] lg:w-[450px] bg-white border-l border-gray-200 flex-col shrink-0">
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <Chat
                            socket={socket}
                            isChatEnabled={isChatEnabled}
                            clearChatTrigger={chatClearTrigger}
                            partnerId={matchedPartnerId}
                            messages={messages}
                            setMessages={setMessages}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoChat;
