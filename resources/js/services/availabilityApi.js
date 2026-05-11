import api from './apiClient';

export const searchAvailability = (params) =>
    api.get('/availability/search', { params }).then(r => r.data);

export const getTimeline = (params) =>
    api.get('/availability/timeline', { params }).then(r => r.data);

export const getSuggestions = (params) =>
    api.get('/availability/suggestions', { params }).then(r => r.data);

export const getLocations = () =>
    api.get('/locations').then(r => r.data);

export const getCalendarEvents = (params) =>
    api.get('/calendar', { params }).then(r => r.data);
