import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../config/api';
import { API_URL } from '../config/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import SettingsPanel from '../components/SettingsPanel';
import '@livekit/components-styles';
import {
    LiveKitRoom,
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    useTracks,
    useLocalParticipant,
} from '@livekit/components-react';
import ChatBox from '../components/ChatBox';
import BottomControlBar from '../components/BottomControlBar';
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
    onCreateQuiz,
    onDownloadReport,
    waitingCount,
    onToggleAttention, // New
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
            onCreateQuiz={onCreateQuiz}
            onDownloadReport={onDownloadReport}
            waitingCount={waitingCount}
            onToggleAttention={onToggleAttention} // New
            room={room}
        />
    );
};

const LiveClass = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();

    // Analytics State
    const [attentionData, setAttentionData] = useState([]);
    const [activeStudents, setActiveStudents] = useState(0);
    const [studentStates, setStudentStates] = useState({});
    const [waitingStudents, setWaitingStudents] = useState([]); // List of students waiting

    // Chat State
    const [messages, setMessages] = useState([]);

    // Quiz State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizData, setQuizData] = useState({ question: '', options: ['', '', '', ''], correctAnswer: 0 });
    const toast = useToast();
    const confirm = useConfirm();

    // Settings Panel State
    const [showSettings, setShowSettings] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showAttention, setShowAttention] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false); // New: Report Modal State
    const [livekitRoom, setLivekitRoom] = useState(null);

    // LiveKit State
    const [token, setToken] = useState("");
    const [liveKitUrl, setLiveKitUrl] = useState("");

    // Audio/Video Control State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const updateAttentionGraph = (avgScore) => {
        setAttentionData(prevData => [
            ...prevData,
            { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), attention: avgScore }
        ]);
    };

    useEffect(() => {
        // Fetch LiveKit Token
        const fetchToken = async () => {
            try {
                const res = await api.post(`${API_URL}/api/class/token`, {
                    roomName: classId,
                    participantName: 'Teacher',
                    identity: `TEACHER_${classId}`, // Ensure unique identity for teacher per class or globally
                    role: 'teacher'
                });
                setToken(res.data.token);
                setLiveKitUrl(res.data.url);
            } catch (error) {
                console.error('Error fetching token:', error);
                toast.showError("Failed to connect to video server");
            }
        };
        fetchToken();
    }, [classId]);

    // Activate class when teacher joins
    useEffect(() => {
        const activateClass = async () => {
            try {
                await api.put(`${API_URL}/api/class/${classId}/activate`);
            } catch (error) {
                console.error('Failed to activate class:', error);
            }
        };
        activateClass();
    }, [classId]);

    useEffect(() => {
        if (!socket) return;

        // Register waiting_list_update listener FIRST, before joining
        socket.on('waiting_list_update', (list) => {
            console.log('[WAITING LIST UPDATE] Received:', list);
            setWaitingStudents(list);
        });

        // NOW emit join_class so we receive the broadcast
        socket.emit('join_class', { classId, studentId: 'TEACHER', user: { name: 'Teacher', role: 'teacher' } });

        socket.on('class_update', (data) => {
            setActiveStudents(data.activeStudents);
        });

        socket.on('full_state_sync', ({ students }) => {
            // Rehydrate state on join
            setStudentStates(prev => {
                const newState = { ...prev };
                students.forEach(s => {
                    newState[s.id] = { status: s.status, handRaised: s.handRaised, name: s.name, score: s.score || 100 };
                });
                return newState;
            });
            updateAttentionGraph(students.map(s => ({ status: s.status }))); // Calculate initial graph point
        });

        socket.on('attention_update', ({ studentId, status, score, responsesCount, totalCount }) => {
            setStudentStates(prev => {
                const prevStudent = prev[studentId] || {};
                const newStates = { ...prev, [studentId]: { ...prevStudent, status, score, responsesCount, totalCount } };

                // Calculate average for graph
                const scores = Object.values(newStates).map(s => s.score || 100);
                const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
                updateAttentionGraph(avg);

                return newStates;
            });
        });

        socket.on('hand_update', ({ studentId, raised, name }) => {
            setStudentStates(prev => {
                const prevStudent = prev[studentId] || {};
                return { ...prev, [studentId]: { ...prevStudent, handRaised: raised, id: studentId, name: name } };
            });
        });

        // Handle new student joining
        socket.on('student_joined', ({ studentId, name }) => {
            setStudentStates(prev => ({
                ...prev,
                [studentId]: {
                    id: studentId,
                    name: name,
                    status: 'FOCUSED',
                    handRaised: false,
                    score: 100 // Default score
                }
            }));
        });

        // Handle student leaving
        socket.on('student_left', ({ studentId }) => {
            setStudentStates(prev => {
                const newState = { ...prev };
                delete newState[studentId];
                return newState;
            });
        });

        // Chat Listener
        socket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            socket.emit('leave_class', { classId });
            socket.off('class_update');
            socket.off('attention_update');
            socket.off('full_state_sync');
            socket.off('hand_update');
            socket.off('waiting_list_update');
            socket.off('receive_message');
        };
    }, [socket, classId]);



    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post(`${API_URL}/api/quiz/create`, {
                classId,
                question: quizData.question,
                options: quizData.options,
                correctAnswer: parseInt(quizData.correctAnswer)
            });

            if (socket) {
                socket.emit('new_quiz', { classId, quiz: res.data });
            }
            socket.emit('quiz_sent', { classId });
            setShowQuizModal(false);
            toast.showSuccess('Quiz sent to students!');
        } catch (error) {
            console.error(error);
            toast.showError('Failed to send quiz');
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...quizData.options];
        newOptions[index] = value;
        setQuizData({ ...quizData, options: newOptions });
    };

    const handleEndClass = async () => {
        const confirmed = await confirm({
            title: 'End Class',
            message: 'Are you sure you want to end this class? This will generate the class report.',
            confirmText: 'Generate Report & End',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) return;

        // Don't exit yet, show report modal
        setShowReportModal(true);
    };

    const finalCloseClass = async () => {
        try {
            await api.put(`${API_URL}/api/class/${classId}/end`);
            toast.showSuccess("Class ended.");
            navigate('/teacher');
        } catch (error) {
            console.error(error);
            toast.showError("Failed to end class");
        }
    };

    const downloadCSV = () => {
        // Headers
        const headers = ['Student Name', 'Status', 'Attention Score', 'Participation (Responses)', 'Total Events'];

        // Data Rows
        const rows = Object.values(studentStates).map(s => [
            s.name || 'Unknown',
            s.status,
            `${s.score !== undefined ? s.score : 100}%`,
            s.responsesCount || 0,
            s.totalCount || 0
        ]);

        // CSV String
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download Blob
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Class_Report_${classId}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.showSuccess("Report downloaded!");
    };

    const downloadChat = () => {
        if (messages.length === 0) {
            toast.showInfo("No chat messages to download.");
            return;
        }

        const logs = messages.map(msg =>
            `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.sender.name}: ${msg.message}`
        ).join('\n');

        const blob = new Blob([logs], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Chat_Log_${classId}_${new Date().toISOString().split('T')[0]}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.showSuccess("Chat log downloaded!");
    };

    const handleDownloadReport = () => {
        window.open(`${API_URL}/api/analytics/report/${classId}`, '_blank');
    };

    if (!token || !liveKitUrl) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-600">Connecting to Live Server...</div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={liveKitUrl}
            data-lk-theme="default"
            style={{ height: '100dvh', background: '#1c1c1e' }}
            onDisconnected={() => navigate('/teacher')}
            onConnected={(room) => setLivekitRoom(room)}
        >
            {/* Main Layout - Full Screen with Bottom Padding for Control Bar */}
            <div className="h-[100dvh] bg-[#1c1c1e] flex relative overflow-hidden">
                {/* Video Grid - Main Area */}
                <div className="flex-1 relative flex flex-col h-full">
                    <div className="flex-1 relative overflow-hidden">
                        <VideoConference />
                    </div>
                    {/* Spacer for bottom control bar */}
                    <div className="h-20 flex-shrink-0"></div>
                </div>

                {/* Unified Sidebar for Participants & Chat & Attention */}
                {(showParticipants || showChat || showAttention) && (
                    <div className="absolute md:relative right-0 top-0 bottom-20 w-full md:w-80 bg-[#2c2c2e] border-l border-[#3c3c3e] flex flex-col h-full z-40 transition-all duration-300 md:h-full md:pb-20">

                        {/* Participants Panel */}
                        {showParticipants && (
                            <div className={`flex flex-col ${showChat || showAttention ? 'h-1/2 border-b border-[#3c3c3e]' : 'h-full'}`}>
                                <div className="p-4 overflow-y-auto flex-1">
                                    {/* Waiting Room Section */}
                                    {waitingStudents.length > 0 && (
                                        <div className="mb-6 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3">
                                            <h3 className="font-bold text-yellow-400 mb-2 flex items-center gap-2">
                                                🔔 Waiting Room ({waitingStudents.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {waitingStudents.map((s) => (
                                                    <div key={s.studentId || 0} className="flex justify-between items-center bg-[#1c1c1e] p-2 rounded shadow-sm">
                                                        <span className="text-sm font-medium text-white">{s.user?.name || 'Student'}</span>
                                                        <button
                                                            onClick={() => socket.emit('approve_student', { classId, studentSocketId: s.socketId })}
                                                            className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                                                        >
                                                            Admit
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Raised Hands */}
                                    {Object.values(studentStates).some(s => s.handRaised) && (
                                        <div className="mb-6">
                                            <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                                                ✋ Hands Raised
                                            </h3>
                                            <div className="space-y-2">
                                                {Object.values(studentStates).filter(s => s.handRaised).map(s => (
                                                    <div key={s.id} className="bg-red-900 bg-opacity-30 border-l-4 border-red-500 p-2 rounded">
                                                        <span className="font-medium text-white">{s.name || 'Unknown Student'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Participants List */}
                                    <div className="mb-6">
                                        <h3 className="font-bold text-gray-300 mb-2 flex items-center gap-2">
                                            👥 Students ({Object.keys(studentStates).length})
                                        </h3>
                                        <div className="space-y-2">
                                            {Object.values(studentStates).length === 0 ? (
                                                <div className="text-gray-500 text-sm italic">No students joined yet</div>
                                            ) : (
                                                Object.values(studentStates).map((student) => (
                                                    <div key={student.id} className="flex items-center justify-between bg-[#1c1c1e] p-2 rounded border border-gray-800">
                                                        <div className="flex items-center gap-2">
                                                            {/* Status Dot */}
                                                            <div className={`w-2 h-2 rounded-full ${student.status === 'DISTRACTED' ? 'bg-red-500' : 'bg-green-500'
                                                                }`} title={student.status === 'DISTRACTED' ? 'Distracted' : 'Focused'} />
                                                            <span className="text-white text-sm font-medium">{student.name || 'Unknown Student'}</span>
                                                            <span className="text-gray-400 text-xs ml-2">
                                                                ({student.responsesCount !== undefined ? student.responsesCount : 0} / {student.totalCount !== undefined ? student.totalCount : 0})
                                                            </span>
                                                        </div>
                                                        {/* Status Icons */}
                                                        <div className="flex items-center gap-1">
                                                            {student.handRaised && <span className="text-xs" title="Hand Raised">✋</span>}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Attention Dashboard Panel */}
                        {showAttention && (
                            <div className={`flex flex-col ${showChat ? 'h-1/2 border-b border-[#3c3c3e]' : 'h-full'}`}>
                                <div className="p-4 overflow-y-auto flex-1 h-full">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                            ⚠️ Attention Dashboard
                                        </h3>
                                        <button
                                            onClick={() => setShowAttention(false)}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Class Average Score */}
                                    <div className="mb-6 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-6 text-center border border-purple-500/30 shadow-lg">
                                        <h4 className="text-gray-300 text-sm font-medium uppercase tracking-wider mb-2">Class Attention Score</h4>
                                        <div className="text-5xl font-bold text-white mb-1">
                                            {/* Calculate dynamic average from student states */}
                                            {Object.keys(studentStates).length > 0
                                                ? Math.round(Object.values(studentStates).reduce((acc, s) => acc + (s.score !== undefined ? s.score : 100), 0) / Object.values(studentStates).length)
                                                : '--'}%
                                        </div>
                                        <p className="text-xs text-purple-300">Live Average based on checks & quizzes</p>
                                    </div>

                                    {/* Student List with Status */}
                                    <div>
                                        <h4 className="text-gray-400 font-semibold mb-3 text-sm uppercase tracking-wider">Student Status</h4>
                                        <div className="space-y-3">
                                            {Object.values(studentStates).length === 0 ? (
                                                <div className="text-gray-500 text-center py-4 italic">No students joined yet</div>
                                            ) : (
                                                Object.values(studentStates).map((student) => (
                                                    <div key={student.id} className="bg-[#1c1c1e] p-3 rounded-lg border border-gray-800 flex items-center justify-between hover:border-gray-700 transition">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-3 h-3 rounded-full shadow-sm ${student.status === 'DISTRACTED' ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'}`} />
                                                            <div>
                                                                <div className="text-white font-medium">{student.name || 'Unknown'}</div>
                                                                <div className="flex gap-2 text-xs">
                                                                    <span className={`${student.status === 'DISTRACTED' ? 'text-red-400' : 'text-green-400'}`}>
                                                                        {student.status === 'DISTRACTED' ? 'Distracted' : 'Focused'}
                                                                    </span>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span className="text-indigo-300 font-bold">
                                                                        Score: {student.score !== undefined ? student.score : 100}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {student.status === 'DISTRACTED' && (
                                                            <span className="text-xl">⚠️</span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Panel */}
                        {showChat && (
                            <div className={`${showParticipants || showAttention ? 'h-1/2' : 'h-full'} bg-white flex flex-col relative`}>
                                <ChatBox
                                    socket={socket}
                                    classId={classId}
                                    user={{ name: 'Teacher', id: 'TEACHER' }}
                                    isOpen={true}
                                    onClose={() => setShowChat(false)}
                                    className="w-full h-full flex flex-col overflow-hidden"
                                    messages={messages} // Pass persisted messages
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Audio Renderer */}
            <RoomAudioRenderer />

            {/* Bottom Control Bar */}
            <ControlBarWrapper
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                onMuteChange={setIsMuted}
                onVideoChange={setIsVideoOff}
                onToggleParticipants={() => setShowParticipants(!showParticipants)}
                onToggleChat={() => setShowChat(!showChat)}
                onToggleSettings={() => setShowSettings(true)}
                onEndCall={handleEndClass}
                isTeacher={true}
                onCreateQuiz={() => setShowQuizModal(true)}
                onDownloadReport={handleDownloadReport}
                waitingCount={waitingStudents.length}
                onToggleAttention={() => setShowAttention(!showAttention)} // New Handler
                room={livekitRoom}
            />

            {/* Quiz Modal */}
            {showQuizModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Create Micro-Quiz</h2>
                        <form onSubmit={handleCreateQuiz}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                                <input type="text" value={quizData.question} onChange={(e) => setQuizData({ ...quizData, question: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter your question" />
                            </div>
                            <div className="mb-4 space-y-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                                {quizData.options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-bold text-gray-700">{idx + 1}.</span>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                                const newOptions = [...quizData.options];
                                                newOptions[idx] = e.target.value;
                                                setQuizData({ ...quizData, options: newOptions });
                                            }}
                                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder={`Option ${idx + 1}`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Correct Option (1-4)</label>
                                <select value={quizData.correctAnswer} onChange={(e) => setQuizData({ ...quizData, correctAnswer: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    {quizData.options.map((_, idx) => <option key={idx} value={idx}>Option {idx + 1}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowQuizModal(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Send Quiz</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* End Class Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm">
                    <div className="bg-[#1c1c1e] text-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-700 animate-scale-in">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                            <div>
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                    📊 Class Report
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">Session Summary & Student Performance</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">{Object.keys(studentStates).length}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-wide">Students</div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                <h4 className="text-gray-400 text-xs uppercase font-semibold mb-1">Class Average Score</h4>
                                <div className="text-3xl font-bold text-green-400">
                                    {Object.keys(studentStates).length > 0
                                        ? Math.round(Object.values(studentStates).reduce((acc, s) => acc + (s.score !== undefined ? s.score : 100), 0) / Object.values(studentStates).length)
                                        : '--'}%
                                </div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                <h4 className="text-gray-400 text-xs uppercase font-semibold mb-1">Active Participation</h4>
                                <div className="text-3xl font-bold text-blue-400">
                                    {Object.values(studentStates).reduce((acc, s) => acc + (s.responsesCount || 0), 0)}
                                    <span className="text-sm text-gray-500 font-normal ml-2">Total Responses</span>
                                </div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                <h4 className="text-gray-400 text-xs uppercase font-semibold mb-1">Attendance</h4>
                                <div className="text-3xl font-bold text-purple-400">
                                    {Object.keys(studentStates).length}
                                    <span className="text-sm text-gray-500 font-normal ml-2">Students</span>
                                </div>
                            </div>
                        </div>

                        {/* Student List Table */}
                        <div className="overflow-hidden rounded-xl border border-gray-700 mb-8 bg-gray-900/50">
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-800 text-gray-300 text-xs uppercase sticky top-0">
                                        <tr>
                                            <th className="p-4 font-semibold">Student Name</th>
                                            <th className="p-4 font-semibold">Status</th>
                                            <th className="p-4 font-semibold">Score</th>
                                            <th className="p-4 font-semibold">Participation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {Object.values(studentStates).map((student) => (
                                            <tr key={student.id} className="hover:bg-gray-800/50 transition">
                                                <td className="p-4 font-medium text-white">{student.name || 'Unknown'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${student.status === 'DISTRACTED' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                                                        {student.status || 'ATTENTIVE'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-white">{student.score !== undefined ? student.score : 100}%</td>
                                                <td className="p-4 text-gray-300">{student.responsesCount || 0} / {student.totalCount || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                            <button
                                onClick={finalCloseClass}
                                className="px-6 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 transition font-medium"
                            >
                                Close Class
                            </button>
                            {/* NEW CHAT DOWNLOAD BUTTON */}
                            <button
                                onClick={downloadChat}
                                className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold shadow-lg hover:shadow-gray-500/20 transition flex items-center gap-2"
                            >
                                💬 Download Chat
                            </button>
                            <button
                                onClick={downloadCSV}
                                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg hover:shadow-blue-500/20 transition flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Report
                            </button>
                            <button
                                onClick={finalCloseClass}
                                className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg hover:shadow-red-500/20 transition"
                            >
                                Finish & Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Panel */}
            <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} room={livekitRoom} />
        </LiveKitRoom>
    );
};

export default LiveClass;
