import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            // Don't redirect if already on login page
            if (!window.location.pathname.includes('/login')) {
                // Will be handled by auth context
            }
        }
        return Promise.reject(error);
    }
);

// ============ AVAILABILITY ============
export const searchAvailability = (params) =>
    api.get('/availability/search', { params }).then(r => r.data);

export const getTimeline = (params) =>
    api.get('/availability/timeline', { params }).then(r => r.data);

export const getSuggestions = (params) =>
    api.get('/availability/suggestions', { params }).then(r => r.data);

// ============ AUTH ============
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

// ============ BOOKINGS ============
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

// ============ ADMIN ============
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

// ============ ROOMS ============
export const getPublicRooms = (params) =>
    api.get('/rooms', { params }).then(r => r.data);

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

// ============ LOCATIONS ============
export const getLocations = () =>
    api.get('/locations').then(r => r.data);

// ============ CALENDAR ============
export const getCalendarEvents = (params) =>
    api.get('/calendar', { params }).then(r => r.data);

// ============ REPORTS ============
export const getUtilizationReport = (params) =>
    api.get('/admin/reports/utilization', { params }).then(r => r.data);

export const getPeakHoursReport = (params) =>
    api.get('/admin/reports/peak-hours', { params }).then(r => r.data);

export default api;
