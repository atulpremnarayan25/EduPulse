import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../config/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';

const Login = () => {
    const [role, setRole] = useState('student'); // 'student' or 'teacher'
    const [formData, setFormData] = useState({
        email: '', password: '', rollNo: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const { connectUser } = useSocket();

    useEffect(() => {
        // Check for token in URL query params (OAuth success)
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const userStr = params.get('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                connectUser();
                toast.showSuccess(`Welcome back, ${user.name}!`);

                if (user.role === 'teacher') {
                    navigate('/teacher');
                } else {
                    navigate('/student');
                }
            } catch (err) {
                console.error('OAuth processing error:', err);
                toast.showError('Login failed');
            }
        }
    }, [location, navigate, connectUser]);


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const url = role === 'student'
            ? '/api/auth/student/login'
            : '/api/auth/teacher/login';

        const payload = role === 'student'
            ? { rollNo: formData.rollNo, password: formData.password }
            : { email: formData.email, password: formData.password };

        try {
            const res = await api.post(url, payload);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            connectUser(); // Reconnect socket with new token

            toast.showSuccess('Login successful');

            if (role === 'student') {
                navigate('/student');
            } else {
                navigate('/teacher');
            }
        } catch (error) {
            if (!error.response) {
                toast.showError('Network Error: Unable to connect to server. Is the backend running?');
            } else {
                toast.showError(error.response?.data?.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80dvh] flex items-center justify-center p-0 md:p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-5xl grid md:grid-cols-2 rounded-none md:rounded-3xl overflow-hidden shadow-2xl min-h-[100dvh] md:min-h-[600px]">

                {/* Left Side: Branding */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-12 flex flex-col justify-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-slide-in"></div>
                    <div className="relative z-10">
                        <h1 className="text-5xl font-extrabold mb-6 tracking-tight">EduPulse</h1>
                        <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
                            Experience the future of real-time learning. Join live classrooms, track attention, and engage like never before.
                        </p>
                        <div className="flex gap-4">
                            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl flex-1">
                                <span className="block text-2xl font-bold">Live</span>
                                <span className="text-sm text-indigo-100">Video & Audio</span>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl flex-1">
                                <span className="block text-2xl font-bold">AI</span>
                                <span className="text-sm text-indigo-100">Attention Metrics</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="p-10 md:p-14 bg-white/50 backdrop-blur-xl flex flex-col justify-center">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                        <p className="text-gray-500">Sign in to continue your journey</p>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
                        <button
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setRole('student')}
                        >
                            Student
                        </button>
                        <button
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setRole('teacher')}
                        >
                            Teacher
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {role === 'student' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Roll Number</label>
                                <input
                                    type="text"
                                    name="rollNo"
                                    value={formData.rollNo}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="e.g. 2023CSB101"
                                    required
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="teacher@example.com"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                placeholder="••••••••"
                                required
                            />
                            <div className="flex justify-end mt-1">
                                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Forgot password?</a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-500">
                        <a href="/admin/login" className="text-gray-400 hover:text-gray-600 hover:underline">
                            Admin Login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
