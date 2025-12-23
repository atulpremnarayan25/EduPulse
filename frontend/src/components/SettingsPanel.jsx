import React, { useState, useEffect } from 'react';

const SettingsPanel = ({ isOpen, onClose, room }) => {
    const [audioDevices, setAudioDevices] = useState([]);
    const [videoDevices, setVideoDevices] = useState([]);
    const [speakerDevices, setSpeakerDevices] = useState([]);
    const [selectedAudio, setSelectedAudio] = useState('');
    const [selectedVideo, setSelectedVideo] = useState('');
    const [selectedSpeaker, setSelectedSpeaker] = useState('');
    const [connectionQuality, setConnectionQuality] = useState('good');
    const [permissionError, setPermissionError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Get available devices
        const getDevices = async () => {
            try {
                // Request permissions first to get proper device labels
                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                } catch (permError) {
                    console.warn('Could not get media permissions:', permError);
                    setPermissionError('Please grant camera and microphone permissions to select devices.');
                }

                const devices = await navigator.mediaDevices.enumerateDevices();

                const audio = devices.filter(d => d.kind === 'audioinput');
                const video = devices.filter(d => d.kind === 'videoinput');
                const speakers = devices.filter(d => d.kind === 'audiooutput');

                setAudioDevices(audio);
                setVideoDevices(video);
                setSpeakerDevices(speakers);

                // Get current selections
                const audioTrack = room?.localParticipant?.getTrackPublication('microphone')?.track;
                const videoTrack = room?.localParticipant?.getTrackPublication('camera')?.track;

                if (audioTrack?.mediaStreamTrack) {
                    setSelectedAudio(audioTrack.mediaStreamTrack.getSettings().deviceId || '');
                }
                if (videoTrack?.mediaStreamTrack) {
                    setSelectedVideo(videoTrack.mediaStreamTrack.getSettings().deviceId || '');
                }
            } catch (error) {
                console.error('Error getting devices:', error);
                setPermissionError('Unable to access media devices. Please check your browser permissions.');
            }
        };

        getDevices();
    }, [isOpen, room]);

    const handleAudioChange = async (deviceId) => {
        setSelectedAudio(deviceId);
        if (room?.localParticipant) {
            try {
                await room.switchActiveDevice('audioinput', deviceId);
            } catch (error) {
                console.error('Error switching audio device:', error);
            }
        }
    };

    const handleVideoChange = async (deviceId) => {
        setSelectedVideo(deviceId);
        if (room?.localParticipant) {
            try {
                await room.switchActiveDevice('videoinput', deviceId);
            } catch (error) {
                console.error('Error switching video device:', error);
            }
        }
    };

    const handleSpeakerChange = async (deviceId) => {
        setSelectedSpeaker(deviceId);
        // Speaker selection is handled differently (browser API)
        try {
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
                if (audio.setSinkId) {
                    audio.setSinkId(deviceId);
                }
            });
        } catch (error) {
            console.error('Error switching speaker:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full animate-scale-in max-h-[90vh] overflow-y-auto">
                <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                    <h3 className="text-lg font-bold">⚙️ Settings</h3>
                    <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Permission Error Alert */}
                    {permissionError && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">{permissionError}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Microphone Settings */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            🎤 Microphone
                        </label>
                        <select
                            value={selectedAudio}
                            onChange={(e) => handleAudioChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Default</option>
                            {audioDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Camera Settings */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            📹 Camera
                        </label>
                        <select
                            value={selectedVideo}
                            onChange={(e) => handleVideoChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Default</option>
                            {videoDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Speaker Settings */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            🔊 Speaker
                        </label>
                        <select
                            value={selectedSpeaker}
                            onChange={(e) => handleSpeakerChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Default</option>
                            {speakerDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Speaker ${speakerDevices.indexOf(device) + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Connection Quality */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">📊 Connection Quality</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-800">Status:</span>
                                <span className={`font-bold ${connectionQuality === 'excellent' ? 'text-green-600' :
                                    connectionQuality === 'good' ? 'text-blue-600' :
                                        connectionQuality === 'fair' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {connectionQuality === 'excellent' ? '🟢 Excellent' :
                                        connectionQuality === 'good' ? '🔵 Good' :
                                            connectionQuality === 'fair' ? '🟡 Fair' : '🔴 Poor'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-700">
                                TIP: Close unused apps and reduce video quality if experiencing lag
                            </div>
                        </div>
                    </div>

                    {/* Video Quality Presets */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">🎬 Video Quality</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-500 text-sm text-gray-900 font-medium">
                                Low (360p)
                            </button>
                            <button className="px-4 py-2 bg-indigo-100 border-2 border-indigo-500 rounded-lg text-sm font-bold text-indigo-700">
                                Standard (720p)
                            </button>
                            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-500 text-sm text-gray-900 font-medium">
                                HD (1080p)
                            </button>
                        </div>
                        <div className="text-xs text-gray-700 mt-2">
                            Lower quality uses less bandwidth
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
