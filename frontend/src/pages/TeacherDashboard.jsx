import React, { useEffect, useState } from 'react';
import api from '../config/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const TeacherDashboard = () => {
    const [activeTab, setActiveTab] = useState('live'); // 'live', 'students', or 'ai'
    const [loading, setLoading] = useState(true);
    const [user] = useState(() => JSON.parse(localStorage.getItem('user')));

    // Live Class State
    const [classes, setClasses] = useState([]);
    const [showCreateClassModal, setShowCreateClassModal] = useState(false);
    const [newClassData, setNewClassData] = useState({ className: '', subjectCode: '' });

    // Student Management State
    const [myClass, setMyClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [newStudentData, setNewStudentData] = useState({ name: '', rollNo: '', email: '' });

    // AI Questions State
    const [aiTopic, setAiTopic] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [aiClassId, setAiClassId] = useState('');
    const [aiQuestions, setAiQuestions] = useState([]); // Generated questions for review
    const [aiGenerating, setAiGenerating] = useState(false);
    const [savedBanks, setSavedBanks] = useState([]);
    const [aiSaving, setAiSaving] = useState(false);
    const [expandedBankId, setExpandedBankId] = useState(null);

    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        if (activeTab === 'live') {
            fetchClasses();
        } else if (activeTab === 'students') {
            fetchMyClassData();
        } else if (activeTab === 'ai') {
            fetchClasses(); // Need classes list for the dropdown
        }
    }, [activeTab]);

    // ==================== LIVE CLASS LOGIC ====================

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/class/teacher/${user.id}`);
            setClasses(res.data);
        } catch (error) {
            console.error('Error fetching classes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/class/create', newClassData);
            setShowCreateClassModal(false);
            setNewClassData({ className: '', subjectCode: '' });
            fetchClasses();
            toast.showSuccess('Class session created!');
        } catch (error) {
            toast.showError(error.response?.data?.message || 'Failed to create class');
        }
    };

    const handleResumeClass = async (classId) => {
        try {
            await api.put(`/api/class/${classId}/resume`);
            fetchClasses();
            toast.showSuccess('Class is now live!');
        } catch (error) {
            toast.showError('Failed to resume class');
        }
    };

    const handleDeleteClass = async (classId, className) => {
        if (!await confirm({
            title: 'Delete Class Session',
            message: `Delete "${className}"? This removes all session data.`,
            confirmText: 'Delete',
            type: 'danger'
        })) return;

        try {
            await api.delete(`/api/class/${classId}/delete`);
            fetchClasses();
            toast.showSuccess('Class deleted');
        } catch (error) {
            toast.showError('Failed to delete class');
        }
    };

    // ==================== STUDENT MANAGEMENT LOGIC ====================

    const fetchMyClassData = async () => {
        setLoading(true);
        try {
            const classRes = await api.get('/api/auth/teacher/my-class');
            if (classRes.data.hasClass) {
                setMyClass(classRes.data.classSection);
                const studentsRes = await api.get('/api/auth/teacher/my-class/students');
                setStudents(studentsRes.data.students);
            } else {
                setMyClass(null);
            }
        } catch (error) {
            console.error('Error fetching student data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/auth/teacher/my-class/students', newStudentData);
            setShowAddStudentModal(false);
            setNewStudentData({ name: '', rollNo: '', email: '' });
            fetchMyClassData();
            toast.showSuccess('Student added successfully');
        } catch (error) {
            toast.showError(error.response?.data?.message || 'Failed to add student');
        }
    };

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Teacher Dashboard</h1>
                    <p className="text-slate-500 font-medium">Manage your sessions and students</p>
                </div>

                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Live Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        My Class & Students
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ai' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        ✨ AI Questions
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : activeTab === 'live' ? (
                    // LIVE CLASSES TAB
                    <div className="animate-slide-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-700">Active & Past Sessions</h2>
                            <button
                                onClick={() => setShowCreateClassModal(true)}
                                className="bg-indigo-600 text-white px-5 py-2 rounded-xl shadow-lg hover:bg-indigo-700 transition font-bold text-sm flex items-center gap-2"
                            >
                                <span>+</span> New Session
                            </button>
                        </div>

                        {classes.length === 0 ? (
                            <div className="glass-panel p-12 rounded-3xl text-center border-dashed border-2 border-slate-200">
                                <div className="text-5xl mb-4">📹</div>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">No sessions created</h3>
                                <p className="text-slate-400">Start a new live class session to engage with your students.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map((cls, idx) => (
                                    <div
                                        key={cls._id}
                                        style={{ animationDelay: `${idx * 0.05}s` }}
                                        onClick={() => navigate(`/teacher/class/${cls._id}`)}
                                        className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
                                    >
                                        <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl ${cls.isActive ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {cls.isActive ? 'LIVE NOW' : 'ENDED'}
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{cls.className}</h3>
                                        <p className="text-xs font-mono text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded mb-4">{cls.subjectCode}</p>

                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                                            <span className="text-xs text-slate-400">ID: {cls._id.slice(-6)}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/teacher/analytics/${cls._id}`); }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="View Analytics"
                                                >
                                                    📊
                                                </button>
                                                {!cls.isActive && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleResumeClass(cls._id); }}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                        title="Resume Class"
                                                    >
                                                        ▶️
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls._id, cls.className); }}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                                    title="Delete Session"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'students' ? (
                    // STUDENTS TAB
                    <div className="animate-slide-in">
                        {!myClass ? (
                            <div className="glass-panel p-16 rounded-3xl text-center">
                                <div className="text-6xl mb-6">🏫</div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">No Class Assigned</h2>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    You are not currently assigned as a "Home Teacher" to any class section.
                                    Please contact an administrator to get assigned to a class (e.g., 1A, 2B) to manage students.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="glass-panel p-8 rounded-3xl mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative overflow-hidden shadow-xl">
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                        <div>
                                            <div className="text-indigo-200 font-bold mb-1 text-sm uppercase tracking-wider">My Class Section</div>
                                            <h2 className="text-4xl font-extrabold">{myClass.name}</h2>
                                            <div className="mt-2 text-indigo-100 flex gap-4 text-sm font-medium">
                                                <span>📅 Year {myClass.year || 'N/A'}</span>
                                                <span>👥 {students.length} Students</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowAddStudentModal(true)}
                                            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 hover:shadow-lg transition flex items-center gap-2"
                                        >
                                            <span>+</span> Add Student
                                        </button>
                                    </div>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
                                </div>

                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Roll No</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {students.map((student) => (
                                                    <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-mono text-sm text-slate-600 font-bold">{student.rollNo}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <span className="font-bold text-slate-700">{student.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{student.email || '-'}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {students.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">
                                                            No students added yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : activeTab === 'ai' ? (
                    // AI QUESTIONS TAB
                    <div className="space-y-8">
                        {/* Generator Card */}
                        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-extrabold mb-1">🤖 AI Question Generator</h2>
                                <p className="text-white/70 mb-6">Enter a topic and let AI create quiz questions for your class</p>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-white/80 mb-1">Class Session</label>
                                        <select
                                            value={aiClassId}
                                            onChange={e => setAiClassId(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                                        >
                                            <option value="" className="text-slate-800">Select class...</option>
                                            {classes.map(cls => (
                                                <option key={cls._id} value={cls._id} className="text-slate-800">
                                                    {cls.className} ({cls.subjectCode || 'No code'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-white/80 mb-1">Topic</label>
                                        <input
                                            type="text"
                                            value={aiTopic}
                                            onChange={e => setAiTopic(e.target.value)}
                                            placeholder="e.g. Newton's Laws of Motion"
                                            className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-white/80 mb-1">Count</label>
                                        <input
                                            type="number"
                                            value={aiCount}
                                            onChange={e => setAiCount(Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))}
                                            min="1"
                                            max="15"
                                            className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateQuestions}
                                    disabled={aiGenerating || !aiTopic.trim() || !aiClassId}
                                    className="px-8 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-white/90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {aiGenerating ? (
                                        <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-700"></div> Generating...</>
                                    ) : (
                                        <>✨ Generate Questions</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Generated Questions Review */}
                        {aiQuestions.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800">📝 Review Generated Questions ({aiQuestions.filter(q => q.approved).length}/{aiQuestions.length} approved)</h3>
                                    <button
                                        onClick={handleSaveQuestions}
                                        disabled={aiSaving || aiQuestions.filter(q => q.approved).length === 0}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {aiSaving ? (
                                            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                                        ) : (
                                            <>💾 Save & Finalize</>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {aiQuestions.map((q, idx) => (
                                        <div
                                            key={q.id}
                                            className={`bg-white rounded-xl border-2 p-5 transition-all ${q.approved ? 'border-green-200 shadow-sm' : 'border-red-200 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-lg">Q{idx + 1}</span>
                                                    <input
                                                        type="text"
                                                        value={q.question}
                                                        onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                                                        className="flex-1 font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 transition"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => updateQuestion(q.id, 'approved', !q.approved)}
                                                        className={`text-xs px-3 py-1 rounded-full font-bold transition ${q.approved ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                    >
                                                        {q.approved ? '✓ Approved' : '✗ Rejected'}
                                                    </button>
                                                    <button
                                                        onClick={() => removeQuestion(q.id)}
                                                        className="text-slate-400 hover:text-red-500 transition p-1"
                                                        title="Delete question"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-10">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateQuestion(q.id, 'correctAnswer', optIdx)}
                                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition ${q.correctAnswer === optIdx
                                                                ? 'bg-green-500 text-white shadow-md'
                                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                                }`}
                                                            title={q.correctAnswer === optIdx ? 'Correct answer' : 'Set as correct'}
                                                        >
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={e => updateOption(q.id, optIdx, e.target.value)}
                                                            className="flex-1 text-sm text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 transition"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Saved Question Banks */}
                        {savedBanks.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-4">📚 Saved Question Banks</h3>
                                <div className="space-y-3">
                                    {savedBanks.map(bank => (
                                        <div key={bank._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <div
                                                onClick={() => setExpandedBankId(expandedBankId === bank._id ? null : bank._id)}
                                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1 rounded-lg">{bank.questions.length} Q</span>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">{bank.topic}</h4>
                                                        <p className="text-xs text-slate-500">{new Date(bank.createdAt).toLocaleDateString()} · {new Date(bank.createdAt).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteBank(bank._id); }}
                                                        className="text-slate-400 hover:text-red-500 p-1 transition"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedBankId === bank._id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                            {expandedBankId === bank._id && (
                                                <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50">
                                                    {bank.questions.map((q, i) => (
                                                        <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                                                            <p className="font-medium text-sm text-slate-800 mb-2"><span className="text-indigo-600 font-bold">Q{i + 1}.</span> {q.question}</p>
                                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                                {q.options.map((opt, oi) => (
                                                                    <span key={oi} className={`px-2 py-1 rounded ${q.correctAnswer === oi ? 'bg-green-100 text-green-700 font-bold' : 'text-slate-500'}`}>
                                                                        {String.fromCharCode(65 + oi)}. {opt}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* MODALS */}

            {/* Create Session Modal */}
            {showCreateClassModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Start New Session</h3>
                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Session Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                                    placeholder="e.g. Mathematics - Algebra"
                                    value={newClassData.className}
                                    onChange={e => setNewClassData({ ...newClassData, className: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Subject Code</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                                    placeholder="e.g. MATH-101"
                                    value={newClassData.subjectCode}
                                    onChange={e => setNewClassData({ ...newClassData, subjectCode: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateClassModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 transition"
                                >
                                    Create Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {showAddStudentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Add Student to {myClass?.name}</h3>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                                    placeholder="e.g. John Doe"
                                    value={newStudentData.name}
                                    onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Roll Number</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                                    placeholder="e.g. 2024001"
                                    value={newStudentData.rollNo}
                                    onChange={e => setNewStudentData({ ...newStudentData, rollNo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email (Optional)</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                                    placeholder="student@example.com"
                                    value={newStudentData.email}
                                    onChange={e => setNewStudentData({ ...newStudentData, email: e.target.value })}
                                />
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-lg text-xs text-indigo-700 mb-2">
                                <p><strong>Note:</strong> Default password will be <code>student123</code></p>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddStudentModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 transition"
                                >
                                    Add Student
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
