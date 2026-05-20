import api from './axios';

export const getQuestionBank    = ()        => api.get('/question-bank');
export const getQuestionById    = (id)      => api.get(`/question-bank/${id}`);
export const createQuestion     = (data)    => api.post('/question-bank', data);
export const updateQuestion     = (id, data)=> api.put(`/question-bank/${id}`, data);
export const deleteQuestion     = (id)      => api.delete(`/question-bank/${id}`);
