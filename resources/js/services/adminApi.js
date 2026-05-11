import api from './apiClient';

export const getAdminBookings = (params) =>
    api.get('/admin/bookings', { params }).then(r => r.data);

export const approveBooking = (id) =>
    api.post(`/admin/bookings/${id}/approve`).then(r => r.data);

export const rejectBooking = (id, reason) =>
    api.post(`/admin/bookings/${id}/reject`, { reason }).then(r => r.data);

export const adminUpdateBooking = (id, data) =>
    api.put(`/admin/bookings/${id}`, data).then(r => r.data);

export const getAdminDashboard = () =>
    api.get('/admin/dashboard').then(r => r.data);

export const getUtilizationReport = (params) =>
    api.get('/admin/reports/utilization', { params }).then(r => r.data);

export const getPeakHoursReport = (params) =>
    api.get('/admin/reports/peak-hours', { params }).then(r => r.data);
