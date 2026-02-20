import React, { useState, useEffect, useRef } from 'react';
import { useMediaDeviceSelect } from '@livekit/components-react';

const BottomControlBar = ({
    isMuted,
    isVideoOff,
    onToggleMute,
    onToggleVideo,
    onToggleParticipants,
    onToggleChat,
    onToggleSettings,
    onEndCall,
    isTeacher = false,
    onCreateQuiz,
    onDownloadReport,
    waitingCount = 0,
    onRaiseHand,
    isHandRaised = false,
    onToggleAttention, // New prop
    room, // New prop for device switching
    onStartAiQuiz,
    aiQuizActive
}) => {
    // LiveKit Device Hooks
    const { devices: audioDevices, activeDeviceId: currentAudioDevice, setActiveMediaDevice: setAudioDevice } = useMediaDeviceSelect({ kind: 'audioinput', room });
    const { devices: videoDevices, activeDeviceId: currentVideoDevice, setActiveMediaDevice: setVideoDevice } = useMediaDeviceSelect({ kind: 'videoinput', room });

    // UI state for dropdowns
    const [showAudioDevices, setShowAudioDevices] = useState(false);
    const [showVideoDevices, setShowVideoDevices] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const audioDropdownRef = useRef(null);
    const videoDropdownRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (audioDropdownRef.current && !audioDropdownRef.current.contains(event.target)) {
                setShowAudioDevices(false);
            }
            if (videoDropdownRef.current && !videoDropdownRef.current.contains(event.target)) {
                setShowVideoDevices(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAudioDeviceChange = async (deviceId) => {
        await setAudioDevice(deviceId);
        setShowAudioDevices(false);
    };

    const handleVideoDeviceChange = async (deviceId) => {
        await setVideoDevice(deviceId);
        setShowVideoDevices(false);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] border-t border-[#3c3c3e] py-2 md:py-4 px-2 md:px-6 z-50 overflow-x-visible">
            <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-2 md:gap-4">
                {/* Left Section - Main Controls (Always Visible) */}
                <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
                    {/* Mute/Unmute */}
                    <div className="relative" ref={audioDropdownRef}>
                        <div className="flex items-center">
                            <button
                                onClick={onToggleMute}
                                className="flex flex-col items-center gap-1 group hover:bg-[#2c2c2e] pl-3 pr-2 py-2 rounded-l-lg transition"
                            >
                                <div className={`p-2 rounded ${isMuted ? 'bg-red-500' : 'bg-transparent'}`}>
                                    {isMuted ? (
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[10px] md:text-xs text-white hidden md:block">{isMuted ? 'Unmute' : 'Mute'}</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAudioDevices(!showAudioDevices);
                                }}
                                className="flex flex-col items-center justify-center hover:bg-[#2c2c2e] pl-1 pr-2 py-2 rounded-r-lg transition border-l border-[#3c3c3e]"
                            >
                                <svg className="w-4 h-4 text-white mt-0 md:mt-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        {showAudioDevices && (
                            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[220px] max-h-64 overflow-y-auto z-50">
                                {audioDevices.length === 0 ? (
                                    <div className="px-4 py-2 text-sm text-gray-500">No microphones found</div>
                                ) : (
                                    audioDevices.map((device) => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => handleAudioDeviceChange(device.deviceId)}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 flex items-center justify-between"
                                        >
                                            <span className="text-gray-900 flex-1 truncate">
                                                {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                                            </span>
                                            {currentAudioDevice === device.deviceId && (
                                                <svg className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Video Toggle */}
                    <div className="relative" ref={videoDropdownRef}>
                        <div className="flex items-center">
                            <button
                                onClick={onToggleVideo}
                                className="flex flex-col items-center gap-1 group hover:bg-[#2c2c2e] pl-3 pr-2 py-2 rounded-l-lg transition"
                            >
                                <div className={`p-2 rounded ${isVideoOff ? 'bg-red-500' : 'bg-transparent'}`}>
                                    {isVideoOff ? (
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[10px] md:text-xs text-white hidden md:block">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowVideoDevices(!showVideoDevices);
                                }}
                                className="flex flex-col items-center justify-center hover:bg-[#2c2c2e] pl-1 pr-2 py-2 rounded-r-lg transition border-l border-[#3c3c3e]"
                            >
                                <svg className="w-4 h-4 text-white mt-0 md:mt-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        {showVideoDevices && (
                            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[220px] max-h-64 overflow-y-auto z-50">
                                {videoDevices.length === 0 ? (
                                    <div className="px-4 py-2 text-sm text-gray-500">No cameras found</div>
                                ) : (
                                    videoDevices.map((device) => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => handleVideoDeviceChange(device.deviceId)}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 flex items-center justify-between"
                                        >
                                            <span className="text-gray-900 flex-1 truncate">
                                                {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                                            </span>
                                            {currentVideoDevice === device.deviceId && (
                                                <svg className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Controls - Desktop (Visible) / Mobile (Hidden in Menu) */}
                <div className="hidden md:flex items-center gap-4">
                    {/* Participants */}
                    <button onClick={onToggleParticipants} className="flex flex-col items-center gap-1 hover:bg-[#2c2c2e] px-3 py-2 rounded-lg transition relative">
                        <div className="p-2">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <span className="text-xs text-white">Participants</span>
                        {isTeacher && waitingCount > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{waitingCount}</span>
                        )}
                    </button>

                    {/* Chat */}
                    <button onClick={onToggleChat} className="flex flex-col items-center gap-1 hover:bg-[#2c2c2e] px-3 py-2 rounded-lg transition">
                        <div className="p-2">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <span className="text-xs text-white">Chat</span>
                    </button>

                    {/* Raise Hand */}
                    {!isTeacher && onRaiseHand && (
                        <button onClick={onRaiseHand} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${isHandRaised ? 'bg-yellow-500' : 'hover:bg-[#2c2c2e]'}`}>
                            <div className="p-2">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                                </svg>
                            </div>
                            <span className="text-xs text-white">{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                        </button>
                    )}

                    {/* Settings */}
                    <button onClick={onToggleSettings} className="flex flex-col items-center gap-1 hover:bg-[#2c2c2e] px-3 py-2 rounded-lg transition">
                        <div className="p-2">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-xs text-white">Settings</span>
                    </button>

                    {/* Teacher specific controls (Desktop) */}
                    {isTeacher && (
                        <div className="flex items-center gap-4">
                            <button onClick={onCreateQuiz} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition font-medium">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Create Quiz
                            </button>
                            {onStartAiQuiz && (
                                <button onClick={onStartAiQuiz} className={`flex items-center gap-2 ${aiQuizActive ? 'bg-amber-500 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded-lg transition font-medium`}>
                                    <span>🤖</span>
                                    {aiQuizActive ? 'AI Quiz Active' : 'AI Quiz'}
                                </button>
                            )}
                            <button onClick={onDownloadReport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Report
                            </button>
                            {onToggleAttention && (
                                <button onClick={onToggleAttention} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition font-medium">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Attention
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile "More" Menu Button (Visible only on Mobile) */}
                <div className="relative md:hidden">
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="flex flex-col items-center gap-1 hover:bg-[#2c2c2e] p-2 rounded-lg transition"
                    >
                        <div className="p-2 bg-[#2c2c2e] rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                            </svg>
                        </div>
                    </button>

                    {/* Mobile Popup Menu */}
                    {showMobileMenu && (
                        <div className="absolute bottom-full right-0 mb-4 bg-[#1c1c1e] border border-[#3c3c3e] rounded-xl shadow-2xl p-4 w-64 z-50 flex flex-col gap-3">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Controls</h3>

                            <button onClick={() => { onToggleParticipants(); setShowMobileMenu(false); }} className="flex items-center gap-3 text-white hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <span>Participants</span>
                                {isTeacher && waitingCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-auto">{waitingCount}</span>}
                            </button>

                            <button onClick={() => { onToggleChat(); setShowMobileMenu(false); }} className="flex items-center gap-3 text-white hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <span>Chat</span>
                            </button>

                            <button onClick={() => { onToggleSettings(); setShowMobileMenu(false); }} className="flex items-center gap-3 text-white hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>Settings</span>
                            </button>

                            {!isTeacher && onRaiseHand && (
                                <button onClick={() => { onRaiseHand(); setShowMobileMenu(false); }} className={`flex items-center gap-3 hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left ${isHandRaised ? 'text-yellow-400' : 'text-white'}`}>
                                    <svg className="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                                    <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                                </button>
                            )}

                            {isTeacher && (
                                <>
                                    <div className="border-t border-[#3c3c3e] my-1"></div>
                                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Teacher Tools</h3>
                                    <button onClick={() => { onCreateQuiz(); setShowMobileMenu(false); }} className="flex items-center gap-3 text-white hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left">
                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span>Create Quiz</span>
                                    </button>
                                    {onStartAiQuiz && (
                                        <button onClick={() => { onStartAiQuiz(); setShowMobileMenu(false); }} className="flex items-center gap-3 text-white hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left">
                                            <span className="text-lg">🤖</span>
                                            <span>{aiQuizActive ? 'AI Quiz Active' : 'AI Quiz'}</span>
                                        </button>
                                    )}
                                    <button onClick={() => { onDownloadReport(); setShowMobileMenu(false); }} className="flex items-center gap-3 text-white hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left">
                                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span>Class Report</span>
                                    </button>
                                    {onToggleAttention && (
                                        <button onClick={() => { onToggleAttention(); setShowMobileMenu(false); }} className="flex items-center gap-3 text-white hover:bg-[#2c2c2e] p-2 rounded-lg transition w-full text-left">
                                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            <span>Attention Check</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Section - End Call (Always Visible but compact on mobile) */}
                <button
                    onClick={onEndCall}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg transition font-semibold"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                    </svg>
                    <span className="hidden md:inline">End Call</span>
                    <span className="md:hidden">End</span>
                </button>
            </div>
        </div>
    );
};

export default BottomControlBar;
