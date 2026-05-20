import api from './axios';

export const getSchemas    = ()                            => api.get('/sandbox/schemas');
export const getSchemaInfo = (schema)                      => api.get(`/sandbox/schema-info/${schema}`);
export const runQuery      = (sql, schema)                 => api.post('/sandbox/run', { sql, schema });
export const checkAnswer   = (sql, question_id)            => api.post('/sandbox/check', { sql, question_id });
