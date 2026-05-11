import api from './apiClient';

export const getBookings = (params) =>
    api.get('/bookings', { params }).then(r => r.data);

export const createBooking = (data) =>
    api.post('/bookings', data).then(r => r.data);

export const getBooking = (id) =>
    api.get(`/bookings/${id}`).then(r => r.data);

export const updateBooking = (id, data) =>
    api.put(`/bookings/${id}`, data).then(r => r.data);

export const cancelBooking = (id) =>
    api.post(`/bookings/${id}/cancel`).then(r => r.data);

export const createRecurringBooking = (data) =>
    api.post('/bookings/recurring', data).then(r => r.data);
