import api from './apiClient';

export const getAdminBookings = (params) =>
    api.get('/admin/bookings', { params }).then(r => r.data);

export const exportAdminBookings = (params) =>
    api.get('/admin/bookings/export', { params, responseType: 'blob' }).then(r => r.data);

export const exportAdminAuditLogs = (params) =>
    api.get('/admin/audit-logs/export', { params, responseType: 'blob' }).then(r => r.data);

export const approveBooking = (id) =>
    api.post(`/admin/bookings/${id}/approve`).then(r => r.data);

export const rejectBooking = (id, reason) =>
    api.post(`/admin/bookings/${id}/reject`, { reason }).then(r => r.data);

export const adminUpdateBooking = (id, data) =>
    api.put(`/admin/bookings/${id}`, data).then(r => r.data);

export const adminCancelBooking = (id, remarks) =>
    api.post(`/admin/bookings/${id}/cancel`, { remarks }).then(r => r.data);

export const markBookingAttendance = (id, status) =>
    api.post(`/admin/bookings/${id}/attendance`, { status }).then(r => r.data);

export const adminCancelBookingSeries = (id, futureOnly = true, remarks = null) =>
    api.post(`/admin/bookings/${id}/cancel-series`, {
        future_only: futureOnly,
        remarks: remarks || undefined,
    }).then(r => r.data);

export const getAdminDashboard = () =>
    api.get('/admin/dashboard').then(r => r.data);

export const getUtilizationReport = (params) =>
    api.get('/admin/reports/utilization', { params }).then(r => r.data);

export const getPeakHoursReport = (params) =>
    api.get('/admin/reports/peak-hours', { params }).then(r => r.data);

export const batchApproveBookings = (ids) =>
    api.post('/admin/bookings/batch-approve', { ids }).then(r => r.data);

export const batchRejectBookings = (ids, reason) =>
    api.post('/admin/bookings/batch-reject', { ids, reason }).then(r => r.data);

export const getAuditLogs = (params) =>
    api.get('/admin/audit-logs', { params }).then(r => r.data);

export const getRoomBlackouts = (roomId) =>
    api.get('/admin/blackouts', { params: { room_id: roomId } }).then(r => r.data);

export const createRoomBlackout = (data) =>
    api.post('/admin/blackouts', data).then(r => r.data);

export const deleteRoomBlackout = (id) =>
    api.delete(`/admin/blackouts/${id}`).then(r => r.data);

export const adminSearchUsers = (q) =>
    api.get('/admin/users/search', { params: { q } }).then(r => r.data);

export const adminCreateBooking = (data) =>
    api.post('/admin/bookings', data).then(r => r.data);

export const getAdminCalendarEvents = (params) =>
    api.get('/admin/calendar', { params }).then(r => r.data);

export const getAdminCalendarSeries = (groupId) =>
    api.get('/admin/calendar/series', { params: { group_id: groupId } }).then(r => r.data);
