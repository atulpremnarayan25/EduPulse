import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';
import { API_URL } from '../config/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';

const Register = () => {
    const [role, setRole] = useState('student'); // 'student' or 'teacher'
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', confirmPassword: '', rollNo: '', year: '', branch: ''
    });
    const navigate = useNavigate();
    const toast = useToast();
    const { connectUser } = useSocket();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (role === 'student' && formData.password !== formData.confirmPassword) {
            toast.showWarning("Passwords do not match");
            return;
        }

        setLoading(true);

        const url = role === 'student'
            ? `${API_URL}/api/auth/student/register`
            : `${API_URL}/api/auth/teacher/register`;

        const payload = role === 'student'
            ? {
                name: formData.name,
                rollNo: formData.rollNo,
                password: formData.password,
                year: formData.year ? parseInt(formData.year) : undefined,
                branch: formData.branch || undefined
            }
            : {
                name: formData.name,
                email: formData.email,
                password: formData.password
            };

        try {
            const res = await api.post(url, payload);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            connectUser(); // Reconnect socket with new token

            if (role === 'student') {
                navigate('/student');
            } else {
                navigate('/teacher');
            }
        } catch (error) {
            if (!error.response) {
                toast.showError('Network Error: Unable to connect to server. Is the backend running?');
            } else {
                toast.showError(error.response?.data?.message || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[90dvh] flex items-center justify-center p-0 md:p-4 animate-fade-in py-6 md:py-12">
            <div className="glass-panel w-full max-w-5xl grid md:grid-cols-2 rounded-none md:rounded-3xl overflow-hidden shadow-2xl min-h-[100dvh] md:min-h-[700px]">

                {/* Left Side: Branding */}
                <div className="hidden md:flex bg-gradient-to-br from-indigo-800 via-purple-700 to-indigo-600 p-12 flex-col justify-center text-white relative">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-slide-in"></div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-extrabold mb-6 leading-tight">Join the Classroom of the Future</h1>
                        <ul className="space-y-6 text-indigo-100">
                            <li className="flex items-center gap-4">
                                <span className="bg-white/20 p-2 rounded-lg">🚀</span>
                                <div>
                                    <strong className="block text-white">Instant Join</strong>
                                    <span className="text-sm">No complex setup. Just click and learn.</span>
                                </div>
                            </li>
                            <li className="flex items-center gap-4">
                                <span className="bg-white/20 p-2 rounded-lg">📊</span>
                                <div>
                                    <strong className="block text-white">Real-time Stats</strong>
                                    <span className="text-sm">Track engagement as it happens.</span>
                                </div>
                            </li>
                            <li className="flex items-center gap-4">
                                <span className="bg-white/20 p-2 rounded-lg">🤝</span>
                                <div>
                                    <strong className="block text-white">Interactive Quizzes</strong>
                                    <span className="text-sm">Test knowledge on the fly.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Side: Register Form */}
                <div className="p-8 md:p-12 bg-white/60 backdrop-blur-xl overflow-y-auto max-h-[90vh]">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
                        <p className="text-gray-500 mt-2">Get started for free</p>
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

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700 ml-1">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-base"
                                required
                            />
                        </div>

                        {role === 'student' ? (
                            <>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700 ml-1">Roll Number</label>
                                    <input
                                        type="text"
                                        name="rollNo"
                                        value={formData.rollNo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700 ml-1">Year</label>
                                        <input
                                            type="number"
                                            name="year"
                                            value={formData.year}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700 ml-1">Branch</label>
                                        <input
                                            type="text"
                                            name="branch"
                                            value={formData.branch}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700 ml-1">Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        {role === 'student' && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 ml-1">Confirm Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        <div className="flex items-center mt-2">
                            <input
                                type="checkbox"
                                id="show-password"
                                checked={showPassword}
                                onChange={() => setShowPassword(!showPassword)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="show-password" className="ml-2 block text-sm text-gray-600 cursor-pointer select-none">
                                Show Passwords
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl mt-6 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Creating Account...' : `Register as ${role === 'student' ? 'Student' : 'Teacher'}`}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
