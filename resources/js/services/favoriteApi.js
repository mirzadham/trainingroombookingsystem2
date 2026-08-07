import api from './apiClient';

export const getFavorites = () =>
    api.get('/favorites').then(r => r.data);

export const addFavorite = (roomId) =>
    api.post(`/favorites/${roomId}`).then(r => r.data);

export const removeFavorite = (roomId) =>
    api.delete(`/favorites/${roomId}`).then(r => r.data);
