import axios from 'axios';

const API_URL = '/api';

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
