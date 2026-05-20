import api from './axios';

export const listSchemas   = ()                    => api.get('/schemas');
export const previewDdl    = (ddl)                 => api.post('/schemas/preview', { ddl });
export const createSchema  = (display_name, ddl)   => api.post('/schemas', { display_name, ddl });
export const updateSchema  = (id, display_name, ddl) => api.put(`/schemas/${id}`, { display_name, ddl });
export const deleteSchema  = (id)                    => api.delete(`/schemas/${id}`);
