import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Video, LogOut } from 'lucide-react';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Simple check for auth - in a real app use AuthContext
    const user = JSON.parse(localStorage.getItem('user'));
    const role = user?.role;

    if (location.pathname === '/login' || location.pathname === '/register' || location.pathname.includes('/class/')) {
        return null;
    }

    const isActive = (path) => location.pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 z-50 flex justify-around py-3 md:hidden safe-area-bottom shadow-lg">
            <button
                onClick={() => navigate(role === 'teacher' ? '/teacher' : '/student')}
                className={`flex flex-col items-center gap-1 ${isActive(role === 'teacher' ? '/teacher' : '/student') ? 'text-indigo-600' : 'text-gray-500'}`}
            >
                <Home size={24} strokeWidth={isActive(role === 'teacher' ? '/teacher' : '/student') ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Home</span>
            </button>

            {/* Placeholder for future features like Classes or Profile */}
            <button
                className="flex flex-col items-center gap-1 text-gray-400 cursor-not-allowed"
            >
                <User size={24} />
                <span className="text-[10px] font-medium">Profile</span>
            </button>

            <button
                onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }}
                className="flex flex-col items-center gap-1 text-gray-500 hover:text-red-500"
            >
                <LogOut size={24} />
                <span className="text-[10px] font-medium">Logout</span>
            </button>
        </div>
    );
};

export default BottomNav;
