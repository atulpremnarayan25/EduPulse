import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, role }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;

    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error('Invalid user data', e);
        }
    }

    if (!token || !user) {
        // Redirect to appropriate login based on expected role
        if (role === 'admin') {
            return <Navigate to="/admin/login" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    if (role && user.role !== role) {
        // Redirect to their appropriate dashboard if they try to access wrong area
        if (user.role === 'admin') {
            return <Navigate to="/admin" replace />;
        } else if (user.role === 'teacher') {
            return <Navigate to="/teacher" replace />;
        } else {
            return <Navigate to="/student" replace />;
        }
    }

    return children;
};

export default PrivateRoute;
