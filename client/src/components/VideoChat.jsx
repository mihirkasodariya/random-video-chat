import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { loadModel, checkImage, isUnsafe } from '../utils/safety';

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
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, waiting, matched
    const [isLocalUnsafe, setIsLocalUnsafe] = useState(false);
    const [isRemoteUnsafe, setIsRemoteUnsafe] = useState(false);

    const [error, setError] = useState(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
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

            // Respect current mute/video off states
            newStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            newStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = newStream;
            }

            // If connected, replace track (advanced)
            if (peerRef.current) {
                const senders = peerRef.current.getSenders();

                // Replace Video
                const videoTrack = newStream.getVideoTracks()[0];
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) videoSender.replaceTrack(videoTrack);

                // Replace Audio (Critical for keeping audio working after stream switch)
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

        socket.on('partnerDisconnected', () => {
            console.log("Partner disconnected, searching for next...");
            handleNext();
        });

        return () => {
            socket.off('match');
            socket.off('signal');
            socket.off('partnerDisconnected');
        };
    }, [socket, stream]);

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
                handleNext();
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
        // Cleanup
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        setRemoteStream(null);
        setIsRemoteUnsafe(false);
        socketRef.current.emit('next');

        // Reset join flag and re-join
        hasJoinedRef.current = false;
        joinQueue();
    };

    const joinQueue = () => {
        if (hasJoinedRef.current) return;
        setStatus('waiting');
        socketRef.current.emit('join');
        hasJoinedRef.current = true;
    };

    useEffect(() => {
        if (stream && socket) {
            // Automatically join queue once we have media and socket
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

            if (remoteVideoRef.current && remoteStream) {
                const predictions = await checkImage(remoteVideoRef.current);
                if (isUnsafe(predictions)) setIsRemoteUnsafe(true);
                else setIsRemoteUnsafe(false);
            }
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, [stream, remoteStream, isVideoOff]);

    // Toggle Functions
    const toggleAudio = () => {
        if (stream) {
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            stream.getAudioTracks().forEach(track => track.enabled = !newMutedState);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const newVideoState = !isVideoOff;
            setIsVideoOff(newVideoState);
            stream.getVideoTracks().forEach(track => track.enabled = !newVideoState);
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
            {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-xl backdrop-blur-md flex items-center gap-3 animate-fade-in border border-white/10">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Main Video Area */}
            <div className="flex-1 relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 group/container">

                {/* Remote Video (Full Size) */}
                <div className={`absolute inset-0 w-full h-full ${isRemoteUnsafe ? 'blur-3xl scale-110 opacity-50' : ''}`}>
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

                {isRemoteUnsafe && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="p-6 bg-red-500/20 rounded-2xl border border-red-500/30 backdrop-blur-md text-center">
                            <h3 className="text-red-200 font-bold text-lg mb-1">Content Hidden</h3>
                            <p className="text-white/60 text-xs">Safety policy violation detected</p>
                        </div>
                    </div>
                )}

                {/* Local Video (PIP) - Mirrored */}
                <div className={`absolute top-4 right-4 w-32 md:w-48 aspect-[3/4] md:aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20 transition-all duration-500 z-20 bg-black ${isLocalUnsafe ? 'ring-red-500' : ''} ${isFlipping ? '[transform:rotateY(180deg)] opacity-50' : 'hover:scale-105'}`}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-transform duration-300 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-md">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLocalUnsafe ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                        <span className="text-[10px] font-medium text-white/90">You</span>
                    </div>

                    {/* Mute/Video Off Indicators for PIP */}
                    {(isMuted || isVideoOff) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] gap-2">
                            {isMuted && <span className="text-white/80 text-lg">🔇</span>}
                            {isVideoOff && <span className="text-white/80 text-lg">📷</span>}
                        </div>
                    )}
                </div>

                {/* Main Controls - Floating Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 rounded-full bg-dark-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl z-30 transition-transform duration-300 hover:scale-105 hover:bg-dark-900/90">

                    {/* Audio Toggle */}
                    <button
                        onClick={toggleAudio}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-500/50' : 'bg-dark-800 text-white hover:bg-dark-700 ring-1 ring-white/10'}`}
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
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isVideoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-500/50' : 'bg-dark-800 text-white hover:bg-dark-700 ring-1 ring-white/10'}`}
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
                        className="h-12 px-8 rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95"
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
