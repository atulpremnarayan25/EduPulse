import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { API_URL } from '../config/api';
import { useToast } from '../context/ToastContext';

const StudentPanel = () => {
    const [classId, setClassId] = useState('');
    const navigate = useNavigate();
    const toast = useToast();

    const [activeClasses, setActiveClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await api.get(`${API_URL}/api/class/active`);
                setActiveClasses(res.data);
            } catch (err) {
                console.error("Failed to fetch active classes");
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
        const interval = setInterval(fetchClasses, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const handleJoin = async (e) => {
        e.preventDefault();
        if (classId.trim()) {
            // Validate class ID exists
            try {
                const response = await api.get(`${API_URL}/api/class/${classId}`);
                const classData = response.data;

                if (!classData || !classData.isActive) {
                    toast.showError('Class not found or not active. Please check the Class ID.');
                    return;
                }

                // Class exists and is active, proceed to join
                navigate(`/student/class/${classId}`);
            } catch (error) {
                console.error('Error validating class:', error);
                toast.showError('Invalid Class ID. Please check and try again.');
            }
        }
    };

    const handleJoinClass = (id) => {
        navigate(`/student/class/${id}`);
    };

    return (
        <div className="max-w-5xl mx-auto mt-4 md:mt-8 p-4 md:p-8 animate-fade-in">
            <h1 className="text-4xl font-extrabold mb-10 text-center gradient-text">Student Dashboard</h1>

            <div className="grid md:grid-cols-12 gap-8 items-start">
                {/* Manual Join */}
                <div className="md:col-span-5 glass-panel p-6 md:p-8 rounded-2xl h-fit sticky top-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Join by ID</h2>
                    </div>

                    <form onSubmit={handleJoin}>
                        <div className="mb-6">
                            <label className="block text-gray-600 text-sm font-semibold mb-2">Enter Class ID</label>
                            <input
                                type="text"
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                placeholder="e.g. 64f1b..."
                                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-mono text-center tracking-widest"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                        >
                            Join Class
                        </button>
                    </form>
                </div>

                {/* Active Classes List */}
                <div className="md:col-span-7">
                    <div className="glass-panel p-6 md:p-8 rounded-2xl min-h-[400px]">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-gray-800">Live Classes Now</span>
                        </h2>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="animate-pulse flex items-center p-4 border border-gray-100 rounded-xl bg-white/30">
                                        <div className="rounded-full bg-gray-200 h-10 w-10 mr-4"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activeClasses.length === 0 ? (
                            <div className="text-center py-12 flex flex-col items-center">
                                <div className="bg-gray-100 p-4 rounded-full mb-4">
                                    <span className="text-2xl opacity-50">😴</span>
                                </div>
                                <p className="text-gray-500 font-medium">No live classes at the moment.</p>
                                <p className="text-sm text-gray-400 mt-1">Check back later or enter an ID manually.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeClasses.map((cls) => (
                                    <div
                                        key={cls._id}
                                        className="group bg-white/50 backdrop-blur-sm border border-white/40 p-5 rounded-xl cursor-pointer hover:shadow-lg transition-transform active:scale-95 md:hover:scale-[1.01] duration-200"
                                        onClick={() => handleJoinClass(cls._id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                                                {cls.className.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800 group-hover:text-indigo-700 transition-colors">{cls.className}</h3>
                                                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{cls.subjectCode}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">by {cls.teacherId?.name || 'Teacher'}</p>
                                            </div>
                                        </div>
                                        <button className="bg-white text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm">
                                            Join
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentPanel;
