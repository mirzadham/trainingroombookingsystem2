import api from './apiClient';
import { ADMIN_TOKEN_KEY } from '../constants/authKeys';

export const login = (data) =>
    api.post('/auth/login', data).then(r => r.data);

export const register = (data) =>
    api.post('/auth/register', data).then(r => r.data);

export const forgotPassword = (data) =>
    api.post('/auth/forgot-password', data).then(r => r.data);

export const resetPassword = (data) =>
    api.post('/auth/reset-password', data).then(r => r.data);

export const adminLogin = (data) =>
    api.post('/auth/admin/login', data).then(r => r.data);

// User logout — token sent by shared interceptor (auth_token)
export const logout = () =>
    api.post('/auth/logout').then(r => r.data);

// Admin logout — explicitly sends admin_token
export const adminLogout = () => {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    return api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.data);
};

// Fetch user info for regular user session
export const getUser = () =>
    api.get('/auth/user').then(r => r.data);

export const updateProfile = (data) =>
    api.put('/auth/user', data).then(r => r.data);

export const updatePassword = (data) =>
    api.put('/auth/user/password', data).then(r => r.data);

// Fetch user info for admin session — sends admin_token explicitly
export const getAdminUser = () => {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    return api.get('/auth/user', {
        headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.data);
};
