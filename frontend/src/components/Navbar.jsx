import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();

    return (
        <nav className="glass-panel sticky top-0 z-50 px-4 py-3 mb-6 hidden md:block">
            <div className="container mx-auto flex justify-between items-center">
                <div
                    className="font-extrabold text-2xl gradient-text tracking-tight cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    EduPulse
                </div>
                {/* Desktop Menu Items could go here in future */}
                <div className="flex gap-4">
                    {/* Placeholder for future desktop nav items */}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
