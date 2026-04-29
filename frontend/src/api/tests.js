import api from './axios';

export const getMyTests = () => api.get('/tests');
export const getTestById = (id) => api.get(`/tests/${id}`);
export const createTest = (formData) => api.post('/tests', formData);
export const updateTest = (id, formData) => api.put(`/tests/${id}`, formData);
export const deleteTest = (id) => api.delete(`/tests/${id}`);
export const addQuestion = (testId, data) => api.post(`/tests/${testId}/questions`, data);
export const deleteQuestion = (testId, questionId) => api.delete(`/tests/${testId}/questions/${questionId}`);
