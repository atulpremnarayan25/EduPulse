import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users, UserCheck, UserX, Activity, ArrowLeft, RefreshCw,
    BarChart, PieChart, Award, Zap, BookOpen
} from 'lucide-react';
import {
    BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell
} from 'recharts';
import { io } from 'socket.io-client';
import Leaderboard from '../components/Leaderboard';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

const AnalyticsDashboard = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [studentStates, setStudentStates] = useState({});
    const [quizStats, setQuizStats] = useState({});
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);

    // Initial connection
    useEffect(() => {
        const token = localStorage.getItem('token');
        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });
        setSocket(newSocket);

        // Fallback timeout: if no data arrives in 5s, stop loading (class may be empty)
        const loadingTimeout = setTimeout(() => {
            setIsLoading(false);
        }, 5000);

        newSocket.on('connect', () => {
            console.log('Connected to analytics socket');
            // Join as teacher (observer)
            newSocket.emit('join_class', {
                classId,
                studentId: 'TEACHER',
                user: { name: 'Teacher (Analytics)' }
            });
        });

        newSocket.on('connect_error', (err) => {
            console.error('Analytics socket connection error:', err.message);
            setIsLoading(false);
        });

        // Listen for all state updates
        // Server sends { students: [...] } — an array of student objects
        newSocket.on('full_state_sync', (data) => {
            const studentsArray = data.students || [];
            const statesMap = {};
            studentsArray.forEach(s => {
                if (s.id) statesMap[s.id] = s;
            });
            setStudentStates(statesMap);
            setIsLoading(false);
            clearTimeout(loadingTimeout);
        });

        newSocket.on('student_joined', ({ student }) => {
            setStudentStates(prev => ({ ...prev, [student.id]: student }));
        });

        newSocket.on('student_left', ({ studentId }) => {
            setStudentStates(prev => {
                const newState = { ...prev };
                delete newState[studentId]; // Or mark as offline if preferred
                return newState;
            });
        });

        newSocket.on('attention_update', (data) => {
            setStudentStates(prev => ({
                ...prev,
                [data.studentId]: {
                    ...prev[data.studentId],
                    status: data.status,
                    score: data.score,
                    responsesCount: data.responsesCount,
                    totalCount: data.totalCount
                }
            }));
        });

        newSocket.on('tab_switch_update', (data) => {
            setStudentStates(prev => ({
                ...prev,
                [data.studentId]: {
                    ...prev[data.studentId],
                    tabSwitchCount: data.tabSwitchCount,
                    focusScore: data.focusScore,
                    totalIdleTime: data.totalIdleTime
                }
            }));
        });

        newSocket.on('student_absent_update', (data) => {
            setStudentStates(prev => ({
                ...prev,
                [data.studentId]: {
                    ...prev[data.studentId],
                    status: 'ABSENT',
                    engagementRate: data.engagementRate
                }
            }));
        });

        newSocket.on('quiz_stats_update', (data) => {
            setQuizStats(data); // Full replacement
        });

        newSocket.on('points_update', (data) => {
            setStudentStates(prev => ({
                ...prev,
                [data.studentId]: {
                    ...prev[data.studentId],
                    points: data.points,
                    badges: data.badges
                }
            }));
        });

        // Cleanup
        return () => {
            clearTimeout(loadingTimeout);
            newSocket.disconnect();
        };
    }, [classId]);

    // Derived Stats
    const stats = useMemo(() => {
        const students = Object.values(studentStates);
        const total = students.length;
        const present = students.filter(s => s.status !== 'ABSENT').length;
        const absent = students.filter(s => s.status === 'ABSENT').length;

        const avgEngagement = total > 0
            ? Math.round(students.reduce((acc, s) => acc + (s.engagementRate || 100), 0) / total)
            : 0;

        return { total, present, absent, avgEngagement };
    }, [studentStates]);

    // Chart Data
    const chartData = useMemo(() => {
        const students = Object.values(studentStates);

        // Active vs Inactive Pie
        const activeCount = students.filter(s => ['ATTENTIVE', 'FOCUSED'].includes(s.status) || !s.status).length;
        const inactiveCount = students.filter(s => ['DISTRACTED', 'ABSENT'].includes(s.status)).length;
        // Default to active if status undefined

        const pieData = [
            { name: 'Active', value: activeCount || 0 },
            { name: 'Inactive', value: inactiveCount || 0 }
        ];

        // Student Performance Bar Data
        const performanceData = students.map(s => ({
            name: s.name || 'Anonymous',
            Engagement: s.engagementRate || 100,
            Understanding: s.totalQuizCount ? Math.round((s.correctQuizCount / s.totalQuizCount) * 100) : 0,
            Focus: s.focusScore || 100
        }));

        return { pieData, performanceData };
    }, [studentStates]);

    const leaderboardData = useMemo(() => {
        return Object.values(studentStates)
            .sort((a, b) => (b.points || 0) - (a.points || 0))
            .map((s, idx) => ({
                rank: idx + 1,
                id: s.id,
                name: s.name,
                points: s.points || 0,
                badges: s.badges || []
            }));
    }, [studentStates]);

    if (isLoading) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Analytics...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/teacher')}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft size={20} /> <span className="hidden sm:inline">Home</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                            Analytics Dashboard
                        </h1>
                        <p className="text-gray-500 text-sm">Real-time class performance</p>
                    </div>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-all"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Total Students"
                    value={stats.total}
                    icon={Users}
                    color="text-blue-400"
                    bgColor="bg-blue-400/10"
                />
                <StatCard
                    label="Present"
                    value={stats.present}
                    icon={UserCheck}
                    color="text-green-400"
                    bgColor="bg-green-400/10"
                />
                <StatCard
                    label="Absent"
                    value={stats.absent}
                    icon={UserX}
                    color="text-red-400"
                    bgColor="bg-red-400/10"
                />
                <StatCard
                    label="Avg Engagement"
                    value={`${stats.avgEngagement}%`}
                    icon={Activity}
                    color="text-indigo-400"
                    bgColor="bg-indigo-400/10"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-800">
                {['Overview', 'Students', 'Questions', 'Leaderboard'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === tab.toLowerCase()
                            ? 'text-indigo-400'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {tab}
                        {activeTab === tab.toLowerCase() && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 gap-6">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <>
                        {/* Top Row Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Combined Engagement Meter / Attendance Score equivalent */}
                            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                                <h3 className="text-lg font-semibold mb-4 text-gray-200">Attendance Score (Engagement Rate)</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RechartsBar data={chartData.performanceData.slice(0, 10)}> {/* Show top 10 for overview */}
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                        <YAxis stroke="#9CA3AF" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                            itemStyle={{ color: '#E5E7EB' }}
                                        />
                                        <Bar dataKey="Engagement" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    </RechartsBar>
                                </ResponsiveContainer>
                            </div>

                            {/* Active vs Inactive */}
                            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                                <h3 className="text-lg font-semibold mb-4 text-gray-200">Active vs Inactive</h3>
                                <div className="flex items-center justify-center h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPie>
                                            <Pie
                                                data={chartData.pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {chartData.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                                            <Legend verticalAlign="bottom" />
                                        </RechartsPie>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Performance Scores (Grouped Bar) */}
                        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                            <h3 className="text-lg font-semibold mb-4 text-gray-200">Performance Scores</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsBar data={chartData.performanceData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                                    <Legend />
                                    <Bar dataKey="Engagement" fill="#6366F1" radius={[4, 4, 0, 0]} name="Engagement" />
                                    <Bar dataKey="Understanding" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Understanding" />
                                    <Bar dataKey="Focus" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Focus" />
                                </RechartsBar>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}

                {/* STUDENTS TAB */}
                {activeTab === 'students' && (
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Engagement</th>
                                    <th className="p-4">Focus Score</th>
                                    <th className="p-4">Points</th>
                                    <th className="p-4">Understanding</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 text-sm text-gray-300">
                                {Object.values(studentStates).map(student => (
                                    <tr key={student.id} className="hover:bg-gray-700/50">
                                        <td className="p-4 font-medium text-white">{student.name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${student.status === 'ABSENT' ? 'bg-red-500/20 text-red-400' :
                                                student.status === 'DISTRACTED' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-green-500/20 text-green-400'
                                                }`}>
                                                {student.status || 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className="p-4">{student.engagementRate || 100}%</td>
                                        <td className="p-4">{student.focusScore || 100}</td>
                                        <td className="p-4">{student.points || 0}</td>
                                        <td className="p-4">
                                            {student.totalQuizCount
                                                ? `${Math.round((student.correctQuizCount / student.totalQuizCount) * 100)}%`
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* QUESTIONS TAB */}
                {activeTab === 'questions' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(quizStats).map(([quizId, stats]) => (
                            <div key={quizId} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-semibold text-white">Quiz ID: {quizId.slice(-6)}</h3>
                                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                                        {stats.totalResponses} Responses
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1 text-gray-400">
                                            <span>Correctness</span>
                                            <span>
                                                {stats.totalResponses > 0
                                                    ? Math.round((stats.correctCount / stats.totalResponses) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500"
                                                style={{ width: `${stats.totalResponses > 0 ? (stats.correctCount / stats.totalResponses) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Answer Distribution</p>
                                        <div className="flex items-end gap-2 h-24 border-b border-gray-700 pb-1">
                                            {Object.entries(stats.answerDistribution || {}).map(([ans, count]) => (
                                                <div key={ans} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                                                    <div
                                                        className="w-full bg-indigo-500/50 rounded-t hover:bg-indigo-500 transition-colors"
                                                        style={{ height: `${(count / stats.totalResponses) * 100}%` }}
                                                    />
                                                    <span className="text-xs text-gray-400">Opt {parseInt(ans) + 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {Object.keys(quizStats).length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500 italic">
                                No quizzes have been conducted yet.
                            </div>
                        )}
                    </div>
                )}

                {/* LEADERBOARD TAB */}
                {activeTab === 'leaderboard' && (
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 max-w-2xl mx-auto w-full">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Award className="text-yellow-400" /> Class Leaderboard
                        </h2>
                        <Leaderboard leaderboard={leaderboardData} currentUserId="teacher-view" />
                    </div>
                )}

            </div>
        </div>
    );
};

// Sub-component for Stats
const StatCard = ({ label, value, icon: Icon, color, bgColor }) => (
    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex items-center justify-between">
        <div>
            <h4 className="text-gray-400 text-sm font-medium mb-1">{label}</h4>
            <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
    </div>
);

export default AnalyticsDashboard;
