import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    const connectUser = () => {
        // Disconnect existing socket if any
        if (socket) {
            socket.disconnect();
        }

        const token = localStorage.getItem('token');
        if (!token) return; // Don't connect without token

        const newSocket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            auth: {
                token: token
            }
        });

        newSocket.on('connect', () => {
            console.log('Socket.IO connected:', newSocket.id);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
        });

        setSocket(newSocket);
    };

    useEffect(() => {
        // Try to connect on mount if token exists
        connectUser();

        return () => {
            if (socket) socket.close();
        };
    }, []); // Run once on mount

    return (
        <SocketContext.Provider value={{ socket, connectUser }}>
            {children}
        </SocketContext.Provider>
    );
};
