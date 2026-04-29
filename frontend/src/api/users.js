import api from './axios';

export const getStudents = () => api.get('/users/students');
export const updateProfile = (data) => api.put('/users/profile', data);
