import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../config/api';
import { API_URL } from '../config/api';
import { useToast } from '../context/ToastContext';
import '@livekit/components-styles';
import {
    LiveKitRoom,
    GridLayout,
    RoomAudioRenderer,
    useTracks,
    ParticipantTile,
    useLocalParticipant,
} from '@livekit/components-react';
import ChatBox from '../components/ChatBox';
import PreJoinScreen from '../components/PreJoinScreen';
import SettingsPanel from '../components/SettingsPanel';
import BottomControlBar from '../components/BottomControlBar';
import Leaderboard from '../components/Leaderboard';
import { Track } from 'livekit-client';

// Component to render video tracks
const VideoConference = () => {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    return (
        <GridLayout tracks={tracks} style={{ height: 'calc(100dvh - 6rem)' }}>
            <ParticipantTile />
        </GridLayout>
    );
};

// Wrapper component for controls that needs LiveKit context
const ControlBarWrapper = ({
    isMuted,
    isVideoOff,
    onMuteChange,
    onVideoChange,
    onToggleParticipants,
    onToggleChat,
    onToggleSettings,
    onEndCall,
    isTeacher,
    onRaiseHand,
    isHandRaised,
    room
}) => {
    const { localParticipant } = useLocalParticipant();

    const handleToggleMute = async () => {
        if (localParticipant) {
            const newMutedState = !isMuted;
            await localParticipant.setMicrophoneEnabled(!newMutedState);
            onMuteChange(newMutedState);
        }
    };

    const handleToggleVideo = async () => {
        if (localParticipant) {
            const newVideoState = !isVideoOff;
            await localParticipant.setCameraEnabled(!newVideoState);
            onVideoChange(newVideoState);
        }
    };

    return (
        <BottomControlBar
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onToggleParticipants={onToggleParticipants}
            onToggleChat={onToggleChat}
            onToggleSettings={onToggleSettings}
            onEndCall={onEndCall}
            isTeacher={isTeacher}
            onRaiseHand={onRaiseHand}
            isHandRaised={isHandRaised}
            room={room}
        />
    );
};

const StudentLiveClass = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const user = JSON.parse(localStorage.getItem('user'));
    const toast = useToast();

    // App State
    const [activeStudents, setActiveStudents] = useState(0);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [hasJoined, setHasJoined] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);

    // Random Attention Check System
    const [showAttentionCheck, setShowAttentionCheck] = useState(false);
    const [attentionCheckCount, setAttentionCheckCount] = useState(0);
    const [attentionCheckResponses, setAttentionCheckResponses] = useState(0);
    const [quizCount, setQuizCount] = useState(0);
    const [quizResponses, setQuizResponses] = useState(0);
    const [checkTimeout, setCheckTimeout] = useState(null);

    // Quiz Timer State
    const [quizTimeLeft, setQuizTimeLeft] = useState(60);
    const quizTimerRef = useRef(null);
    const quizStartTimeRef = useRef(null);

    // Tab Switching / Idle Tracking State
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [totalIdleTime, setTotalIdleTime] = useState(0);
    const [focusScore, setFocusScore] = useState(100);
    const lastHiddenTimeRef = useRef(null);

    // Gamification State
    const [points, setPoints] = useState(0);
    const [badges, setBadges] = useState([]);
    const [consecutiveResponses, setConsecutiveResponses] = useState(0);
    const [correctQuizCount, setCorrectQuizCount] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isMarkedAbsent, setIsMarkedAbsent] = useState(false);

    // LiveKit State
    const [token, setToken] = useState("");
    const [liveKitUrl, setLiveKitUrl] = useState("");
    const [livekitRoom, setLivekitRoom] = useState(null);

    const [isWaiting, setIsWaiting] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);

    // Peer Tracking State
    const [classmates, setClassmates] = useState({});

    // Chat State
    const [messages, setMessages] = useState([]);

    // Audio/Video Control State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        if (!socket) return;

        // Socket Listeners
        socket.on('join_error', (err) => { toast.showError(err.message); navigate('/student'); });
        socket.on('class_update', (data) => setActiveStudents(data.activeStudents));
        socket.on('new_quiz', (quiz) => {
            setActiveQuiz(quiz);
            setQuizCount(prev => prev + 1);
            setQuizTimeLeft(60);
            quizStartTimeRef.current = Date.now();
        });
        socket.on('class_ended', () => { toast.showInfo('The teacher has ended the class.'); navigate('/student'); });

        socket.on('join_approved', () => {
            console.log("Join Approved Event Received!");
            setIsWaiting(false);
            socket.emit('join_class', { classId, studentId: user.id, user: { name: user.name } });
        });

        // Sync list of peers
        socket.on('full_state_sync', ({ students }) => {
            const studentMap = {};
            students.forEach(s => {
                if (s.id !== user.id) {
                    studentMap[s.id] = { id: s.id, name: s.name, status: s.status, handRaised: s.handRaised };
                }
            });
            setClassmates(studentMap);
        });

        socket.on('student_joined', ({ studentId, name }) => {
            if (studentId !== user.id) {
                setClassmates(prev => ({ ...prev, [studentId]: { id: studentId, name, status: 'FOCUSED', handRaised: false } }));
            }
        });

        socket.on('student_left', ({ studentId }) => {
            setClassmates(prev => {
                const newState = { ...prev };
                delete newState[studentId];
                return newState;
            });
        });

        socket.on('hand_update', ({ studentId, raised, name }) => {
            setClassmates(prev => {
                if (!prev[studentId]) return prev;
                return { ...prev, [studentId]: { ...prev[studentId], handRaised: raised } };
            });
        });

        // Leaderboard updates
        socket.on('leaderboard_update', (data) => {
            setLeaderboard(data);
        });

        // Chat Listener
        socket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        console.log("Registered join_approved listener");

        // Request to join
        socket.emit('request_to_join', { classId, studentId: user.id, user: { name: user.name } });

        return () => {
            console.log("Unmounting. Removing listeners.");
            socket.emit('leave_class', { classId });
            socket.off('class_update');
            socket.off('new_quiz');
            socket.off('class_ended');
            socket.off('join_error');
            socket.off('join_approved');
            socket.off('receive_message');
            socket.off('leaderboard_update');
        };
    }, [socket, classId, user.id, user.name, navigate]);

    useEffect(() => {
        // Fetch LiveKit Token
        const fetchToken = async () => {
            try {
                const res = await api.post(`${API_URL}/api/class/token`, {
                    roomName: classId,
                    participantName: user.name || 'Student',
                    identity: user.id,
                    role: 'student'
                });
                setToken(res.data.token);
                setLiveKitUrl(res.data.url);
            } catch (error) {
                console.error("Failed to get LiveKit token", error);
            }
        };
        fetchToken();
    }, [classId, user.name]);

    // ===== Helper: Update engagement & check 80% threshold =====
    const checkEngagementThreshold = useCallback((newAttentionResponses, newQuizResponses, newAttentionCount, newQuizCount) => {
        const totalEvents = newAttentionCount + newQuizCount;
        const totalResponses = newAttentionResponses + newQuizResponses;
        const rate = totalEvents > 0 ? Math.round((totalResponses / totalEvents) * 100) : 100;

        // After at least 3 events, check if below 80%
        if (totalEvents >= 3 && rate < 80 && !isMarkedAbsent) {
            setIsMarkedAbsent(true);
            toast.showError('⚠️ Your engagement has dropped below 80%. You have been marked absent!');
            if (socket) {
                socket.emit('student_absent', { classId, studentId: user.id, engagementRate: rate });
            }
        }
        return rate;
    }, [isMarkedAbsent, socket, classId, user.id, toast]);

    // ===== Helper: Update gamification points & badges =====
    const updatePoints = useCallback((pointsToAdd, isCorrectQuiz = false) => {
        setPoints(prev => {
            const newPoints = prev + pointsToAdd;
            return newPoints;
        });

        if (isCorrectQuiz) {
            setCorrectQuizCount(prev => prev + 1);
        }

        setConsecutiveResponses(prev => {
            const newConsec = prev + 1;
            return newConsec;
        });
    }, []);

    // Emit points + badges whenever they change
    useEffect(() => {
        if (!socket || !hasJoined || isWaiting) return;

        // Compute badges
        const newBadges = [];
        if (consecutiveResponses >= 3) newBadges.push('🔥');
        if (correctQuizCount >= 3) newBadges.push('🧠');
        if (focusScore === 100 && tabSwitchCount === 0) newBadges.push('👀');
        setBadges(newBadges);

        socket.emit('points_update', { classId, studentId: user.id, points, badges: newBadges });
    }, [points, consecutiveResponses, correctQuizCount, focusScore, tabSwitchCount]);

    // ===== Tab Switching / Idle Tracking =====
    useEffect(() => {
        if (isWaiting || !hasJoined) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab switched away — record the time
                lastHiddenTimeRef.current = Date.now();
            } else {
                // Tab came back — calculate idle time
                if (lastHiddenTimeRef.current) {
                    const idleDuration = Date.now() - lastHiddenTimeRef.current;
                    lastHiddenTimeRef.current = null;

                    setTabSwitchCount(prev => prev + 1);
                    setTotalIdleTime(prev => prev + idleDuration);

                    // Compute focus score: starts at 100, loses 5 per switch + 2 per idle minute
                    setTabSwitchCount(prevSwitches => {
                        const newSwitches = prevSwitches; // already incremented above
                        setTotalIdleTime(prevIdle => {
                            const totalIdleMinutes = prevIdle / 60000;
                            const newFocusScore = Math.max(0, Math.round(100 - (newSwitches * 5) - (totalIdleMinutes * 2)));
                            setFocusScore(newFocusScore);

                            // Emit to server
                            if (socket) {
                                socket.emit('tab_switch', {
                                    classId,
                                    studentId: user.id,
                                    tabSwitchCount: newSwitches,
                                    focusScore: newFocusScore,
                                    totalIdleTime: prevIdle
                                });
                            }
                            return prevIdle;
                        });
                        return prevSwitches;
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isWaiting, hasJoined, socket, classId, user.id]);

    // ===== Quiz Timer (60-second countdown) =====
    useEffect(() => {
        if (!activeQuiz) {
            // Clear timer when no quiz
            if (quizTimerRef.current) clearInterval(quizTimerRef.current);
            return;
        }

        setQuizTimeLeft(60);
        quizStartTimeRef.current = Date.now();

        quizTimerRef.current = setInterval(() => {
            setQuizTimeLeft(prev => {
                if (prev <= 1) {
                    // Time's up — auto-dismiss quiz
                    clearInterval(quizTimerRef.current);
                    setActiveQuiz(null);
                    setConsecutiveResponses(0); // Break streak
                    toast.showError('⏰ Time\'s up! Quiz auto-dismissed.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (quizTimerRef.current) clearInterval(quizTimerRef.current);
        };
    }, [activeQuiz?._id]);

    // ===== Random Attention Check Functions =====
    const getRandomInterval = () => {
        const min = 360000; // 6 minutes in ms
        const max = 720000; // 12 minutes in ms
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const scheduleNextCheck = () => {
        const interval = getRandomInterval();
        console.log(`Next attention check in ${interval / 1000} seconds`);

        const scheduleTimeout = setTimeout(() => {
            setShowAttentionCheck(true);
            setAttentionCheckCount(prev => prev + 1);

            // Auto-dismiss after 5 seconds if no response
            const dismissTimeout = setTimeout(() => {
                setShowAttentionCheck(false);
                setConsecutiveResponses(0); // Break streak

                if (socket) {
                    const newAttentionCount = attentionCheckCount + 1;
                    const totalEvents = newAttentionCount + quizCount;
                    const totalResponses = attentionCheckResponses + quizResponses;
                    const score = totalEvents > 0 ? Math.round((totalResponses / totalEvents) * 100) : 100;

                    socket.emit('attention_update', {
                        classId,
                        studentId: user.id,
                        status: 'DISTRACTED',
                        score: score,
                        responsesCount: totalResponses,
                        totalCount: totalEvents
                    });

                    checkEngagementThreshold(attentionCheckResponses, quizResponses, newAttentionCount, quizCount);
                }
                scheduleNextCheck();
            }, 5000);

            setCheckTimeout(dismissTimeout);
        }, interval);
    };

    const handleAttentionResponse = () => {
        if (checkTimeout) clearTimeout(checkTimeout);

        setShowAttentionCheck(false);
        setAttentionCheckResponses(prev => prev + 1);
        updatePoints(10); // +10 points for attention response

        if (socket) {
            const totalEvents = attentionCheckCount + quizCount;
            const totalResponses = attentionCheckResponses + 1 + quizResponses;
            const score = totalEvents > 0 ? Math.round((totalResponses / totalEvents) * 100) : 100;

            socket.emit('attention_update', {
                classId,
                studentId: user.id,
                status: 'ATTENTIVE',
                score: score,
                responsesCount: totalResponses,
                totalCount: totalEvents
            });

            checkEngagementThreshold(attentionCheckResponses + 1, quizResponses, attentionCheckCount, quizCount);
        }

        scheduleNextCheck();
    };

    // Start attention check system when admitted to class
    useEffect(() => {
        if (!isWaiting && hasJoined) {
            console.log('Starting attention check system');
            scheduleNextCheck();
        }
    }, [isWaiting, hasJoined]);

    const handleRaiseHand = () => {
        const newState = !isHandRaised;
        setIsHandRaised(newState);
        if (socket) socket.emit('raise_hand', { classId, studentId: user.id, raised: newState, name: user.name });
    };

    const handleQuizSubmit = async (answerIndex) => {
        if (!activeQuiz) return;
        if (quizTimerRef.current) clearInterval(quizTimerRef.current);

        const responseTime = quizStartTimeRef.current ? Date.now() - quizStartTimeRef.current : 0;

        try {
            await api.post(`${API_URL}/api/quiz/response`, { quizId: activeQuiz._id, studentId: user.id, answer: answerIndex, responseTime });

            const newQuizResponses = quizResponses + 1;
            setQuizResponses(newQuizResponses);

            if (socket) {
                const isCorrect = activeQuiz.correctAnswer === answerIndex;
                socket.emit('quiz_response', { classId, studentId: user.id, isCorrect, selectedAnswer: answerIndex, quizId: activeQuiz._id });

                // Points: +20 correct, +5 wrong
                updatePoints(isCorrect ? 20 : 5, isCorrect);

                const totalEvents = attentionCheckCount + quizCount;
                const totalResponses = attentionCheckResponses + newQuizResponses;
                const score = totalEvents > 0 ? Math.round((totalResponses / totalEvents) * 100) : 100;

                socket.emit('attention_update', {
                    classId,
                    studentId: user.id,
                    status: 'ATTENTIVE',
                    score: score,
                    responsesCount: totalResponses,
                    totalCount: totalEvents
                });

                checkEngagementThreshold(attentionCheckResponses, newQuizResponses, attentionCheckCount, quizCount);
            }
            setActiveQuiz(null);
            toast.showSuccess('Quiz Submitted!');
        } catch (error) { console.error(error); toast.showError('Failed to submit quiz'); }
    };

    if (!hasJoined) {
        return <PreJoinScreen user={user} onJoin={() => setHasJoined(true)} />;
    }

    if (isWaiting) {
        return (
            <div className="flex h-screen bg-gray-50 overflow-hidden relative">
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="flex items-center mb-6">
                        <button onClick={() => setShowSettings(true)} className="mr-2 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center gap-2">
                            <span>⚙️</span> Settings
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 mr-4">Class: {classId}</h1>
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">👥 {activeStudents} Active</span>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500 animate-pulse"></div>
                        <div className="animate-bounce mb-6 text-6xl">⏳</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting Room</h2>
                        <p className="text-gray-500 mb-8">Waiting for the teacher to admit you...</p>

                        <button
                            onClick={() => setShowChat(!showChat)}
                            className="w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition flex items-center justify-center gap-2"
                        >
                            <span>💬</span> {showChat ? 'Hide Chat' : 'Chat with Teacher'}
                        </button>
                    </div>
                </div>

                {/* Waiting Room Chat Panel */}
                <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white">
                        <h3 className="font-bold">Lobby Chat</h3>
                        <button onClick={() => setShowChat(false)} className="hover:bg-indigo-700 p-1 rounded">✕</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ChatBox
                            socket={socket}
                            classId={classId}
                            user={{ name: user.name, id: user.id }}
                            isOpen={true}
                            onClose={() => setShowChat(false)}
                            className="w-full h-full flex flex-col"
                            messages={messages}
                        />
                    </div>
                </div>

                {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
            </div>
        );
    }

    if (!token || !liveKitUrl) {
        return <div className="flex h-screen items-center justify-center">Connecting to Class...</div>;
    }

    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={liveKitUrl}
            data-lk-theme="default"
            style={{ height: '100dvh', background: '#1c1c1e' }}
            onDisconnected={() => navigate('/student')}
            onConnected={(room) => setLivekitRoom(room)}
        >
            {/* Main Video Area with Dark Background */}
            <div className="h-[100dvh] bg-[#1c1c1e] flex relative overflow-hidden">
                <div className="flex-1 relative flex flex-col h-full">
                    <div className="flex-1 relative overflow-hidden">
                        <VideoConference />
                    </div>
                </div>

                {/* Unified Sidebar for Participants & Chat */}
                {(showParticipants || showChat) && (
                    <div className="absolute md:relative right-0 top-0 bottom-20 w-full md:w-80 bg-[#2c2c2e] border-l border-[#3c3c3e] flex flex-col h-full z-40 transition-all duration-300 md:h-full md:pb-20">
                        {/* Participants Panel */}
                        {showParticipants && (
                            <div className={`flex flex-col ${showChat ? 'h-1/2 border-b border-[#3c3c3e]' : 'h-full'}`}>
                                <div className="p-4 overflow-y-auto flex-1">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-white text-lg">Participants</h3>
                                        <button
                                            onClick={() => setShowParticipants(false)}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="mb-4 bg-[#1c1c1e] rounded p-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Active Students</span>
                                            <span className="font-bold text-indigo-400 text-2xl">{activeStudents}</span>
                                        </div>
                                    </div>

                                    <div className="mb-4 bg-[#1c1c1e] rounded p-4">
                                        <h4 className="font-semibold text-white mb-2">Classmates ({Object.keys(classmates).length})</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {Object.values(classmates).length === 0 ? (
                                                <div className="text-gray-500 text-xs italic">No other students joined yet</div>
                                            ) : (
                                                Object.values(classmates).map((student) => (
                                                    <div key={student.id} className="flex items-center justify-between border-b border-gray-800 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${student.status === 'DISTRACTED' ? 'bg-red-500' : 'bg-green-500'}`} />
                                                            <span className="text-gray-300 text-sm">{student.name || 'Unknown'}</span>
                                                        </div>
                                                        {student.handRaised && <span className="text-xs" title="Hand Raised">✋</span>}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-4 bg-[#1c1c1e] rounded p-4">
                                        <h4 className="font-semibold text-white mb-2">Your Stats</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Attention Score</span>
                                                <span className={`font-bold ${isMarkedAbsent ? 'text-red-400' : 'text-green-400'}`}>
                                                    {(attentionCheckCount + quizCount) > 0
                                                        ? `${Math.round(((attentionCheckResponses + quizResponses) / (attentionCheckCount + quizCount)) * 100)}%`
                                                        : '--'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Focus Score</span>
                                                <span className={`font-bold ${focusScore >= 80 ? 'text-green-400' : focusScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {focusScore}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Tab Switches</span>
                                                <span className={`text-white ${tabSwitchCount > 5 ? 'text-red-400' : ''}`}>{tabSwitchCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Participation</span>
                                                <span className="text-white">{(attentionCheckResponses + quizResponses)} / {(attentionCheckCount + quizCount)} events</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Quiz Responses</span>
                                                <span className="text-white">{quizResponses} / {quizCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Points</span>
                                                <span className="font-bold text-yellow-400">{points} pts</span>
                                            </div>
                                            {badges.length > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Badges</span>
                                                    <div className="flex gap-1">
                                                        {badges.map((b, i) => <span key={i} className="text-lg" title={
                                                            b === '🔥' ? 'Streak (3+ consecutive)' : b === '🧠' ? 'Quiz Master (3+ correct)' : 'Focused (100% focus)'
                                                        }>{b}</span>)}
                                                    </div>
                                                </div>
                                            )}
                                            {isMarkedAbsent && (
                                                <div className="mt-2 p-2 bg-red-900/30 border border-red-500/40 rounded-lg text-red-300 text-xs text-center">
                                                    ⚠️ Marked Absent — engagement below 80%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Leaderboard */}
                                    <div className="mb-4 bg-[#1c1c1e] rounded p-4">
                                        <h4 className="font-semibold text-white mb-2">🏆 Leaderboard</h4>
                                        <Leaderboard leaderboard={leaderboard} currentUserId={user.id} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Panel */}
                        {showChat && (
                            <div className={`${showParticipants ? 'h-1/2' : 'h-full'} bg-white flex flex-col relative`}>
                                <ChatBox
                                    socket={socket}
                                    classId={classId}
                                    user={{ name: user.name, id: user.id }}
                                    isOpen={true}
                                    onClose={() => setShowChat(false)}
                                    className="w-full h-full flex flex-col overflow-hidden"
                                    messages={messages} // Pass persisted messages
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Minimal Top Status Overlay */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>{activeStudents} Online</span>
                    </div>
                    <div className="text-gray-300">|</div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-300">Attention:</span>
                        <span className={`font-bold ${isMarkedAbsent ? 'text-red-400' : 'text-green-400'}`}>
                            {(attentionCheckCount + quizCount) > 0
                                ? `${Math.round(((attentionCheckResponses + quizResponses) / (attentionCheckCount + quizCount)) * 100)}%`
                                : '--'}
                        </span>
                    </div>
                    <div className="text-gray-300">|</div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-300">Focus:</span>
                        <span className={`font-bold ${focusScore >= 80 ? 'text-green-400' : focusScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {focusScore}%
                        </span>
                    </div>
                    <div className="text-gray-300">|</div>
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400 font-bold">{points}</span>
                        <span className="text-gray-400">pts</span>
                    </div>
                </div>

                {/* Absent Warning Banner */}
                {isMarkedAbsent && (
                    <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-full text-sm font-semibold animate-pulse z-50">
                        ⚠️ Engagement below 80% — Marked Absent
                    </div>
                )}

            </div>

            {/* Audio Renderer */}
            <RoomAudioRenderer />

            {/* Bottom Control Bar - Student Version */}
            <ControlBarWrapper
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                onMuteChange={setIsMuted}
                onVideoChange={setIsVideoOff}
                onToggleParticipants={() => setShowParticipants(!showParticipants)}
                onToggleChat={() => setShowChat(!showChat)}
                onToggleSettings={() => setShowSettings(true)}
                onEndCall={() => navigate('/student')}
                isTeacher={false}
                onRaiseHand={handleRaiseHand}
                isHandRaised={isHandRaised}
                room={livekitRoom}
            />

            {/* Random Attention Check Modal */}
            {showAttentionCheck && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 rounded-2xl shadow-2xl animate-scale-in max-w-md">
                        <h2 className="text-3xl font-bold mb-4">👋 Attention Check!</h2>
                        <p className="mb-6 text-lg">Click below to confirm you're paying attention</p>
                        <button
                            onClick={handleAttentionResponse}
                            className="w-full bg-white text-indigo-600 font-bold py-4 px-6 rounded-xl hover:bg-gray-100 transition transform hover:scale-105 shadow-lg"
                        >
                            ✅ I'm Here & Attentive!
                        </button>
                        <p className="text-xs mt-4 opacity-75 text-center">⏱️ This popup will disappear in 5 seconds</p>
                    </div>
                </div>
            )}

            {/* Quiz Modal with 60-second Timer */}
            {activeQuiz && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg relative animate-slide-up">
                        {/* Timer Progress Bar */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 rounded-t-2xl overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-linear rounded-t-2xl ${quizTimeLeft > 30 ? 'bg-indigo-600' : quizTimeLeft > 10 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${(quizTimeLeft / 60) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-bold text-indigo-700">📝 Live Quiz</h2>
                            <div className={`text-lg font-bold px-3 py-1 rounded-full ${quizTimeLeft > 30 ? 'bg-indigo-100 text-indigo-700' : quizTimeLeft > 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700 animate-pulse'
                                }`}>
                                ⏱️ {quizTimeLeft}s
                            </div>
                        </div>
                        <p className="mb-6 text-lg font-medium">{activeQuiz.question}</p>
                        <div className="space-y-3">
                            {activeQuiz.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuizSubmit(idx)}
                                    className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 flex items-center gap-3 group"
                                >
                                    <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="text-gray-700 font-medium">{option}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-6 text-center">Select an answer before time runs out!</p>
                    </div>
                </div>
            )}

            {/* Settings Panel */}
            <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} room={livekitRoom} />
        </LiveKitRoom>
    );
};

export default StudentLiveClass;
