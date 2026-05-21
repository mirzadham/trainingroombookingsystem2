import api from './apiClient';

export const getPublicRooms = (params) =>
    api.get('/rooms', { params }).then(r => r.data);

export const getPublicRoom = (id, params) =>
    api.get(`/rooms/${id}`, { params }).then(r => r.data);

export const getRoomsWithTimeline = (params) =>
    api.get('/rooms/available', { params }).then(r => r.data);

export const getAdminRooms = () =>
    api.get('/admin/rooms').then(r => r.data);

export const createRoom = (data) =>
    api.post('/admin/rooms', data).then(r => r.data);

export const updateRoom = (id, data) =>
    api.put(`/admin/rooms/${id}`, data).then(r => r.data);

export const deleteRoom = (id) =>
    api.delete(`/admin/rooms/${id}`).then(r => r.data);

export const toggleRoomActive = (id) =>
    api.post(`/admin/rooms/${id}/toggle-active`).then(r => r.data);
