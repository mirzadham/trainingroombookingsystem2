import api from './apiClient';

export const login = (data) =>
    api.post('/auth/login', data).then(r => r.data);

export const register = (data) =>
    api.post('/auth/register', data).then(r => r.data);

export const adminLogin = (data) =>
    api.post('/auth/admin/login', data).then(r => r.data);

export const logout = () =>
    api.post('/auth/logout').then(r => r.data);

export const getUser = () =>
    api.get('/auth/user').then(r => r.data);
