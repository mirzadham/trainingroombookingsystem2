import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';

/**
 * Heart toggle button for saving/removing a room from favorites.
 * - Guests are redirected to the login page.
 * - State stays in sync via the shared ['favorites'] query key.
 */
export default function FavoriteButton({ roomId, className = '', size = 'md' }) {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: favorites = [] } = useQuery({
        queryKey: ['favorites'],
        queryFn: () => api.getFavorites(),
        enabled: isAuthenticated,
        staleTime: 60_000,
    });

    const isFavorited = favorites.some((f) => Number(f.id) === Number(roomId));

    const toggleMutation = useMutation({
        mutationFn: () => (isFavorited ? api.removeFavorite(roomId) : api.addFavorite(roomId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    const handleClick = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        toggleMutation.mutate();
    };

    const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <button
            onClick={handleClick}
            aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
            title={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
            className={`${sizeClasses} rounded-full flex items-center justify-center backdrop-blur-md border shadow-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
                isFavorited
                    ? 'bg-white border-red-200 text-red-500'
                    : 'bg-white/85 border-white/40 text-slate-500 hover:text-red-500 hover:border-red-200'
            } ${className}`}
        >
            <Heart className={`${iconSize} ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
    );
}
