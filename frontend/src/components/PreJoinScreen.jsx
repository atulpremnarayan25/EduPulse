import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';

const PreJoinScreen = ({ onJoin, user }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const toast = useToast();

    useEffect(() => {
        let localStream = null;
        const startCamera = async () => {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(localStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = localStream;
                }
            } catch (err) {
                console.error("Error accessing media devices:", err);
                toast.showError("Please allow camera and microphone access to join.");
            }
        };

        startCamera();

        return () => {
            // If we don't proceed to join, we should stop tracks? 
            // Actually, we want to Pass this stream to the parent if joined. 
            // If component unmounts without joining, cleanup.
            // But we can't easily distinguish 'unmount due to join' vs 'unmount due to navigate away' inside here effectively without props.
            // For now, let's NOT stop tracks here. Parent will handle stream if passed, or we assume specific cleanup.
            // Actually, better practice: Parent manages the stream acquisition? 
            // Or: We pass stream up continuously?
            // Let's stop tracks ONLY if we are navigating away. 
            // We'll rely on the parent (StudentLiveClass) to NOT re-request stream if we pass it.
        };
    }, []);

    const toggleAudio = () => {
        if (stream) {
            stream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsAudioMuted(!isAudioMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    const handleJoin = () => {
        onJoin(stream);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full text-center">
                <h1 className="text-3xl font-bold mb-2">Ready to join?</h1>
                <p className="text-gray-500 mb-8">Role: {user?.role || 'Student'} • {user?.name}</p>

                <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-6 shadow-inner mx-auto max-w-lg">
                    {isVideoOff ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">Camera Off</div>
                    ) : (
                        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    )}

                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                        <button
                            onClick={toggleAudio}
                            className={`p-3 rounded-full ${isAudioMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-white transition`}
                        >
                            {isAudioMuted ?
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg> :
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            }
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-white transition`}
                        >
                            {isVideoOff ?
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg> :
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            }
                        </button>
                    </div>
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={handleJoin}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 shadow-lg transform hover:scale-105 transition"
                    >
                        Join Class
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreJoinScreen;
