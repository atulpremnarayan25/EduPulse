import axios from 'axios';

// Get API URL from environment variables
// For local development across devices, use your machine's IP address
// Set VITE_API_URL in .env file, e.g., VITE_API_URL=http://192.168.1.100:5001
const getApiUrl = () => {
    // If environment variable is set, use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // For local development, try to use the same host as the frontend
    // This allows other devices on the network to connect
    const hostname = window.location.hostname;
    const port = 5001; // Backend port

    // If accessing via localhost, use localhost
    // Otherwise, use the current hostname (IP address)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://localhost:${port}`;
    }

    return `http://${hostname}:${port}`;
};

export const API_URL = getApiUrl();
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

// Create configured axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
