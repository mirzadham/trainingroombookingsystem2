import api from './apiClient';

export const getMyWaitlist = () =>
    api.get('/waitlist').then(r => r.data);

export const joinWaitlist = (data) =>
    api.post('/waitlist', data).then(r => r.data);

export const leaveWaitlist = (id) =>
    api.delete(`/waitlist/${id}`).then(r => r.data);
