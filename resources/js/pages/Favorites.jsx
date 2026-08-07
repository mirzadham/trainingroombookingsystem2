import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Users, Loader2, Trash2, CalendarCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import { assetPath } from '../utils/basePath';

export default function Favorites() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: favorites = [], isLoading } = useQuery({
        queryKey: ['favorites'],
        queryFn: () => api.getFavorites(),
        enabled: isAuthenticated,
    });

    const removeMutation = useMutation({
        mutationFn: (roomId) => api.removeFavorite(roomId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
    });

    if (!isAuthenticated) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-mimos-500/8 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-mimos-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign in to view your favorites</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                    Save the rooms you like and find them again in one place.
                </p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 bg-mimos-500 hover:bg-mimos-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-mimos-500/25 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                    Sign In
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
                    <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    My Favorite Rooms
                </h1>
                <p className="text-sm text-slate-500 mt-1">Rooms you have saved for quick access</p>
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-mimos-500 animate-spin mb-3" />
                    <span className="text-slate-500 text-sm">Loading favorites...</span>
                </div>
            )}

            {!isLoading && favorites.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">🤍</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No favorites yet</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Tap the heart on any room to save it here for later.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 bg-mimos-500 hover:bg-mimos-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-mimos-500/25 transition cursor-pointer"
                    >
                        Browse Rooms
                    </button>
                </div>
            )}

            {favorites.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((room) => (
                        <div
                            key={room.id}
                            className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-100/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-mimos-500/30 cursor-pointer group"
                            onClick={() => navigate(`/rooms/${room.id}`)}
                        >
                            {/* Image */}
                            <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100">
                                <img
                                    src={assetPath(room.images?.[0] || room.image_url || '/images/rooms/default.png')}
                                    alt={room.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                                {/* Remove button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeMutation.mutate(room.id);
                                    }}
                                    className="absolute top-3 right-3 p-2 rounded-full bg-white/85 backdrop-blur-md border border-slate-200/60 text-slate-500 hover:text-red-500 hover:border-red-200 shadow-sm transition-all hover:scale-110 cursor-pointer"
                                    aria-label="Remove from favorites"
                                    title="Remove from favorites"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Details */}
                            <div className="p-5">
                                <h3 className="text-base font-semibold text-slate-900 mb-0.5 group-hover:text-mimos-500 transition-colors truncate">
                                    {room.name}
                                </h3>
                                {room.location_legend && room.location_legend.toLowerCase() !== 'tbc' && (
                                    <p className="text-xs text-slate-400 font-semibold mb-2">
                                        {room.location_legend}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                        <MapPin className="w-3.5 h-3.5 text-mimos-500" />
                                        {room.location?.name} ({room.location?.code})
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                        <Users className="w-3.5 h-3.5 text-mimos-500" />
                                        Up to {room.capacity} pax
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/rooms/${room.id}`);
                                    }}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-mimos-500 hover:bg-mimos-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-mimos-500/20 transition-all cursor-pointer"
                                >
                                    <CalendarCheck className="w-4 h-4" />
                                    Check Availability
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
