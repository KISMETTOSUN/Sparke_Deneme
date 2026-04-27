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

export const fetchFolders = async () => {
    const response = await axios.get(`${API_URL}/uipath/folders`);
    return response.data;
};

export const fetchProcesses = async (folderId) => {
    const response = await axios.get(`${API_URL}/uipath/processes/${folderId}`);
    return response.data;
};

export const fetchRobotsForFolder = async (folderId) => {
    const response = await axios.get(`${API_URL}/uipath/robots/${folderId}`);
    return response.data;
};

export const startUiPathJob = async (folderId, releaseKey, robotIds) => {
    const response = await axios.post(`${API_URL}/uipath/start-job`, { folderId, releaseKey, robotIds });
    return response.data;
};

export const fetchConnections = async () => {
    const response = await axios.get(`${API_URL}/connections`);
    return response.data;
};

export const fetchConnectionConfig = async (type) => {
    const response = await axios.get(`${API_URL}/connections/${type}`);
    return response.data;
};

export const saveExternalConnection = async (type, data) => {
    const response = await axios.post(`${API_URL}/connections/${type}`, data);
    return response.data;
};

export const fetchTriggers = async () => {
    const response = await axios.get(`${API_URL}/triggers`);
    return response.data;
};

export const saveTrigger = async (data) => {
    const response = await axios.post(`${API_URL}/triggers`, data);
    return response.data;
};

export const deleteTrigger = async (id) => {
    const response = await axios.delete(`${API_URL}/triggers/${id}`);
    return response.data;
};

export const fetchTriggerLogs = async () => {
    const response = await axios.get(`${API_URL}/trigger-logs`);
    return response.data;
};
