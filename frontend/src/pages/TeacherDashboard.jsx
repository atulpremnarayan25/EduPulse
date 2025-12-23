import React, { useEffect, useState } from 'react';
import api from '../config/api';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const TeacherDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newClassData, setNewClassData] = useState({ className: '', subjectCode: '' });
    const [creating, setCreating] = useState(false);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const toast = useToast();
    const confirm = useConfirm();

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API_URL}/api/class/teacher/${user.id}`);
            setClasses(res.data);
        } catch (error) {
            console.error('Error fetching classes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post(`${API_URL}/api/class/create`, {
                ...newClassData
            });
            setShowCreateModal(false);
            setNewClassData({ className: '', subjectCode: '' });
            fetchClasses();
        } catch (error) {
            toast.showError(error.response?.data?.message || 'Failed to create class');
        } finally {
            setCreating(false);
        }
    };

    const handleResumeClass = async (classId) => {
        try {
            await api.put(`${API_URL}/api/class/${classId}/resume`);
            fetchClasses(); // Refresh list to show updated status
            toast.showSuccess('Class is now live! Click to join.');
        } catch (error) {
            console.error(error);
            toast.showError('Failed to resume class');
        }
    };

    const handleDeleteClass = async (classId, className) => {
        const confirmed = await confirm({
            title: 'Delete Class',
            message: `Are you sure you want to delete "${className}"? This action cannot be undone and will remove all associated data.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await api.delete(`${API_URL}/api/class/${classId}/delete`);
            fetchClasses();
            toast.showSuccess('Class deleted successfully');
        } catch (error) {
            console.error(error);
            toast.showError(error.response?.data?.message || 'Failed to delete class');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8 animate-fade-in">
                <h1 className="text-3xl font-extrabold text-gray-800">My Classes</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all transform hover:scale-105 font-medium flex items-center gap-2"
                >
                    <span>+</span> Create New Class
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : classes.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center animate-scale-in">
                    <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">📚</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">No classes yet</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">Get started by creating your first class. You can then share the Class ID with your students to join.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-full shadow hover:bg-indigo-700 transition"
                    >
                        Create First Class
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {classes.map((cls, idx) => (
                        <div
                            key={cls._id}
                            style={{ animationDelay: `${idx * 0.1}s` }}
                            className="glass-card p-4 md:p-6 rounded-2xl cursor-pointer animate-slide-in relative group transition-transform active:scale-95 md:hover:scale-[1.02] duration-200"
                            onClick={() => navigate(`/teacher/class/${cls._id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{cls.className}</h3>
                                    <p className="text-sm font-medium text-gray-500 bg-gray-100/50 inline-block px-2 py-1 rounded mt-1">{cls.subjectCode}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${cls.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                                    {cls.isActive ? 'LIVE' : 'ENDED'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100/50">
                                <div className="flex items-center text-xs text-gray-400 font-mono gap-1">
                                    <span>ID: {cls._id.slice(-6)}...</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(cls._id);
                                            toast.showSuccess('Class ID copied!');
                                        }}
                                        className="text-indigo-500 hover:text-indigo-700 p-1 hover:bg-indigo-50 rounded"
                                        title="Copy Full ID"
                                    >
                                        📋
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!cls.isActive && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleResumeClass(cls._id);
                                            }}
                                            className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition"
                                        >
                                            Go Live
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClass(cls._id, cls.className);
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                                        title="Delete class"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-scale-in border border-gray-100">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Class</h2>
                        <form onSubmit={handleCreateClass}>
                            <div className="mb-5">
                                <label className="block text-gray-700 text-sm font-semibold mb-2">Class Name</label>
                                <input
                                    type="text"
                                    value={newClassData.className}
                                    onChange={(e) => setNewClassData({ ...newClassData, className: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                    placeholder="e.g. Advanced Physics"
                                    required
                                />
                            </div>
                            <div className="mb-8">
                                <label className="block text-gray-700 text-sm font-semibold mb-2">Subject Code / Description</label>
                                <input
                                    type="text"
                                    value={newClassData.subjectCode}
                                    onChange={(e) => setNewClassData({ ...newClassData, subjectCode: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                    placeholder="e.g. PHY-101"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className={`px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all ${creating ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {creating ? 'Creating...' : 'Create Class'}
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
