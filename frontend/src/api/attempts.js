import api from './axios';

export const getMyAssignments = () => api.get('/attempts/assignments');
export const startAttempt = (assignment_id) => api.post('/attempts', { assignment_id });
export const submitAttempt = (attemptId, answers) => api.post(`/attempts/${attemptId}/submit`, { answers });
export const getAttempt = (attemptId) => api.get(`/attempts/${attemptId}`);
export const reviewAttempt = (attemptId) => api.get(`/attempts/${attemptId}/review`);
export const gradeAttempt = (attemptId, text_grades, comments) => api.post(`/attempts/${attemptId}/grade`, { text_grades, comments });
