import axios from 'axios';

const API_URL = '/api';

// Add a request interceptor to include the JWT token
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const login = async (username, password) => {
    const response = await axios.post(`${API_URL}/login`, { username, password });
    return response.data;
};

export const fetchRobots = async () => {
    const response = await axios.get(`${API_URL}/robots`);
    return response.data;
};

export const fetchActivity = async () => {
    const response = await axios.get(`${API_URL}/activity`);
    return response.data;
};

export const triggerRobot = async (id) => {
    const response = await axios.post(`${API_URL}/trigger/${id}`);
    return response.data;
};

export const fetchConfig = async (type) => {
    const response = await axios.get(`${API_URL}/config/${type}`);
    return response.data;
};

export const saveConfig = async (type, data) => {
    const response = await axios.post(`${API_URL}/config/${type}`, data);
    return response.data;
};
