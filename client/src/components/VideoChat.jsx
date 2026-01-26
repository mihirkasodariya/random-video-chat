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

                {/* Remote Overlays: Partner Camera Off ONLY */}
                {partnerVideoOff && remoteStream && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900 animate-fade-in">
                        <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center mb-4 ring-1 ring-white/5 shadow-2xl">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-zinc-500">
                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p className="text-zinc-500 text-sm font-medium">Partner’s camera is turned off</p>
                    </div>
                )}

                {/* SAFETY ALERT BANNER (Top Center - Visible to Both) */}
                {(isLocalUnsafe || isRemoteUnsafe) && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slide-in-top">
                        <div className="bg-red-600/90 backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl border border-red-500/50 flex flex-col items-center text-center gap-2">
                            <div className="flex items-center gap-2 text-lg font-bold">
                                <span className="text-2xl animate-pulse">⚠️</span>
                                <span>Sexual Activity Detected</span>
                            </div>
                            {isLocalUnsafe ? (
                                <p className="text-sm font-medium text-red-100">
                                    Your camera feed is currently visible to your connected partner.
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-red-100">
                                    Sexual activity detected in partner's video.
                                </p>
                            )}
                        </div>
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

                    {/* Local Overlays: Camera Off ONLY */}
                    {isVideoOff && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-zinc-900 z-10">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-2 ring-1 ring-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-zinc-500">
                                    <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                                    <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium">Your camera is turned off</p>
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
