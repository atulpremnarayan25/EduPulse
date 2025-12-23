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
        return <Navigate to="/login" replace />;
    }

    if (role && user.role !== role) {
        // Redirect to their appropriate dashboard if they try to access wrong area
        return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
    }

    return children;
};

export default PrivateRoute;
