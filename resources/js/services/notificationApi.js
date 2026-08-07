import api from './apiClient';

export const getNotifications = (params) =>
    api.get('/notifications', { params }).then(r => r.data);

export const getUnreadNotificationCount = () =>
    api.get('/notifications/unread-count').then(r => r.data);

export const markNotificationRead = (id) =>
    api.post(`/notifications/${id}/read`).then(r => r.data);

export const markAllNotificationsRead = () =>
    api.post('/notifications/read-all').then(r => r.data);
