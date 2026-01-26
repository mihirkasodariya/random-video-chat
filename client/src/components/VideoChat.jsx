import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { loadModel, checkImage, isUnsafe } from '../utils/safety';
import MatchGate from './MatchGate';

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

    useEffect(() => {
        setupCamera();

        // Load Safety Model
        loadModel().then(loaded => {
            if (loaded) console.log("NSFW Model loaded");
        });

        const newSocket = io('/');
        setSocket(newSocket);
        socketRef.current = newSocket;

        // Auto-join on mount/load is handled by effect depending on stream & socket below

        return () => {
            // Cleanup handled in handleEndCall or page unload usually, but good to be safe
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

            // Respect current mute/video off states
            newStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            newStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = newStream;
            }

            // If connected, replace track (advanced)
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

    // Ensure video element gets stream if ref updates or stream updates later
    useEffect(() => {
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Same for remote
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);


    useEffect(() => {
        if (!socket) return;

        socket.on('match', async ({ initiator, roomId, partnerId }) => {
            console.log("Matched with", partnerId, "Initiator:", initiator);
            setStatus('matched');
            partnerIdRef.current = partnerId;
            initializePeer(initiator, partnerId);

            // Reset partner state on new match
            setPartnerMuted(false);
            setPartnerVideoOff(false);

            // Send my current state to new partner
            socket.emit('mediaState', {
                target: partnerId,
                isMuted,
                isVideoOff
            });
        });

        socket.on('signal', async ({ sender, signal }) => {
            if (peerRef.current) {
                if (signal.type === 'offer') {
                    await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await peerRef.current.createAnswer();
                    await peerRef.current.setLocalDescription(answer);
                    socket.emit('signal', { target: sender, signal: answer });
                } else if (signal.type === 'answer') {
                    await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                } else if (signal.candidate) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            }
        });

        socket.on('mediaState', ({ sender, isMuted: remoteMuted, isVideoOff: remoteVideoOff }) => {
            if (sender === partnerIdRef.current) {
                setPartnerMuted(remoteMuted);
                setPartnerVideoOff(remoteVideoOff);
            }
        });

        socket.on('partnerDisconnected', () => {
            console.log("Partner disconnected, searching for next...");
            // Automatically try next unless we are blocked
            if (!showGate && !isAdPlaying) {
                handleNext();
            }
        });

        return () => {
            socket.off('match');
            socket.off('signal');
            socket.off('mediaState');
            socket.off('partnerDisconnected');
        };
    }, [socket, stream, showGate, isAdPlaying, isMuted, isVideoOff]); // Added deps to prevent auto-next when blocked

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
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                if (!showGate && !isAdPlaying) {
                    handleNext();
                }
            }
        };

        if (initiator) {
            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
                socketRef.current.emit('signal', { target: partnerId, signal: offer });
            });
        }
    };

    const handleNext = () => {
        if (showGate || isAdPlaying) return;

        // Increment count
        const newCount = nextClickCount + 1;
        setNextClickCount(newCount);

        // Disconnect current
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        setRemoteStream(null);
        setIsRemoteUnsafe(false);
        setPartnerMuted(false);
        setPartnerVideoOff(false);
        socketRef.current.emit('next');

        // Check if we reached the limit (5 clicks => 6th action is block)
        if (newCount > 5) {
            setShowGate(true);
            setStatus('idle');
            hasJoinedRef.current = false; // Reset so we don't auto-join
            return;
        }

        // Reset join flag and re-join
        hasJoinedRef.current = false;
        joinQueue();
    };

    const handleClaim = () => {
        setShowGate(false);
        setIsAdPlaying(true);

        // Simulate Ad
        setTimeout(() => {
            setIsAdPlaying(false);
            setNextClickCount(0); // Reset count
            joinQueue(); // Auto connect
        }, 3000);
    };

    const handleGateClose = () => {
        setShowGate(false);
        // Do not reset count, do not join queue. User is stuck until they claim.
        // Actually, if they close, they might be "idle". Next button will likely just open gate again since count > 5.
    };

    const handleEndCall = () => {
        // Cleanup and navigate home
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
        // Only auto-join if we are NOT blocked
        if (stream && socket && !showGate && !isAdPlaying && nextClickCount <= 5) {
            joinQueue();
        }
    }, [stream, socket]);

    // Safety Check Loop
    useEffect(() => {
        const interval = setInterval(async () => {
            if (localVideoRef.current && stream && !isVideoOff) {
                const predictions = await checkImage(localVideoRef.current);
                if (isUnsafe(predictions)) setIsLocalUnsafe(true);
                else setIsLocalUnsafe(false);
            }

            if (remoteVideoRef.current && remoteStream && !partnerVideoOff) {
                const predictions = await checkImage(remoteVideoRef.current);
                if (isUnsafe(predictions)) setIsRemoteUnsafe(true);
                else setIsRemoteUnsafe(false);
            }
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, [stream, remoteStream, isVideoOff, partnerVideoOff]);

    // Toggle Functions
    const toggleAudio = () => {
        if (stream) {
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            stream.getAudioTracks().forEach(track => track.enabled = !newMutedState);

            // Sync
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

            // Sync
            if (partnerIdRef.current) {
                socketRef.current.emit('mediaState', {
                    target: partnerIdRef.current,
                    isMuted,
                    isVideoOff: newVideoState
                });
            }
        }
    };

    const [isFlipping, setIsFlipping] = useState(false);

    const switchCamera = async () => {
        setIsFlipping(true);
        // Small delay to allow flip animation to start before stream cuts
        await new Promise(r => setTimeout(r, 300));

        const newMode = facingMode === 'user' ? 'environment' : 'user';
        await setupCamera(newMode);

        setIsFlipping(false);
    };

    return (
        <div className="flex flex-col h-full w-full max-w-6xl mx-auto md:px-4 gap-4 relative">
            <MatchGate isOpen={showGate} onClose={handleGateClose} onClaim={handleClaim} />

            {/* Ad Overlay */}
            {isAdPlaying && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center text-white">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-xl font-bold">Watching Ad...</p>
                    <p className="text-sm text-gray-400">Please wait to verify your account</p>
                </div>
            )}

            {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-xl backdrop-blur-md flex items-center gap-3 animate-fade-in border border-white/10">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Main Video Area */}
            <div className="flex-1 relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 group/container">

                {/* Remote Video (Full Size) */}
                <div className={`absolute inset-0 w-full h-full ${isRemoteUnsafe || partnerVideoOff ? 'blur-3xl scale-110 opacity-50' : ''} transition-all duration-500`}>
                    {remoteStream ? (
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full bg-dark-800 text-white/30 gap-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-white/5 animate-[spin_8s_linear_infinite] border-t-primary-500/50"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce-slow">
                                    {status === 'waiting' ? '👀' : '👋'}
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xl font-medium text-white/80 tracking-wide">
                                    {status === 'waiting' ? 'Searching for partner...' : 'Connecting...'}
                                </p>
                                <p className="text-sm text-white/40"> Be kind & respectful </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Remote Overlays: Unsafe or Partner Camera Off */}
                {(isRemoteUnsafe || partnerVideoOff) && remoteStream && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-center animate-fade-in">
                        {isRemoteUnsafe ? (
                            <div className="p-6 bg-red-500/20 rounded-2xl border border-red-500/30 backdrop-blur-md">
                                <h3 className="text-red-200 font-bold text-lg mb-1">Content Hidden</h3>
                                <p className="text-white/60 text-xs">Safety policy violation detected</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white/50">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-white font-semibold text-xl tracking-wide">Partner’s camera is off</h3>
                                    <p className="text-white/50 text-sm">Video hidden for privacy</p>
                                    <p className="text-white/30 text-xs mt-2 font-light">Content hidden for safety</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Partner Muted Indicator */}
                {partnerMuted && remoteStream && !partnerVideoOff && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 z-20 animate-fade-in">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
                            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                        </svg>
                        <span className="text-sm font-medium text-white/90">Partner is muted</span>
                    </div>
                )}


                {/* Local Video (PIP) - Mirrored */}
                <div className={`absolute top-4 right-4 w-32 md:w-48 aspect-[3/4] md:aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20 transition-all duration-500 z-20 bg-black ${isLocalUnsafe ? 'ring-red-500' : ''} ${isFlipping ? '[transform:rotateY(180deg)] opacity-50' : 'hover:scale-105'}`}>

                    {/* Video with Blur if Off/Unsafe */}
                    <div className={`absolute inset-0 ${isVideoOff || isLocalUnsafe ? 'blur-md bg-white/5' : ''}`}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover transition-transform duration-300 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                        />
                    </div>

                    {/* Local Overlays: Unsafe or Camera Off */}
                    {(isVideoOff || isLocalUnsafe) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/40 backdrop-blur-[2px]">
                            {isVideoOff ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white/70 mb-1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-2.158A6 6 0 002 9h-.008v.008H2.022a16.99 16.99 0 001.763 8.818M15 14.25v2.25a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25v-4.5a2.25 2.25 0 012.25-2.25h.75m6 0h.75M16.5 12a4.5 4.5 0 00-6.364-6.364M9.75 9.75l1.5 1.5" />
                                    </svg>
                                    <p className="text-[10px] font-bold text-white leading-tight">Camera is turned off</p>
                                    <p className="text-[8px] text-white/60 leading-tight mt-0.5">Not visible to partner</p>
                                </>
                            ) : (
                                <p className="text-[10px] text-red-300 font-bold">Unsafe Content</p>
                            )}
                        </div>
                    )}

                    {/* Identification Badge */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLocalUnsafe ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                        <span className="text-[10px] font-medium text-white/90">You</span>
                    </div>

                    {/* Muted Icon (Local) */}
                    {isMuted && !isVideoOff && (
                        <div className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Main Controls - Floating Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 rounded-full bg-dark-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl z-30 transition-transform duration-300 hover:scale-105 hover:bg-dark-900/90">

                    {/* End Call Button */}
                    <button
                        onClick={handleEndCall}
                        disabled={isAdPlaying || showGate}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 bg-red-600/90 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="End Call & Exit"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="w-[1px] h-8 bg-white/10 mx-1"></div>


                    {/* Audio Toggle */}
                    <button
                        onClick={toggleAudio}
                        disabled={isAdPlaying || showGate}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-500/50' : 'bg-dark-800 text-white hover:bg-dark-700 ring-1 ring-white/10'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>

                    {/* Video Toggle */}
                    <button
                        onClick={toggleVideo}
                        disabled={isAdPlaying || showGate}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isVideoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-500/50' : 'bg-dark-800 text-white hover:bg-dark-700 ring-1 ring-white/10'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isVideoOff ? "Start Video" : "Stop Video"}
                    >
                        {isVideoOff ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>

                    <div className="w-[1px] h-8 bg-white/10 mx-1"></div>

                    {/* Next Button */}
                    <button
                        onClick={handleNext}
                        disabled={isAdPlaying}
                        className="h-12 px-8 rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Next</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoChat;
