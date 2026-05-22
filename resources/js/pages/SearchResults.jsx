import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MapPin, Users } from 'lucide-react';
import * as api from '../services/api';

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const locationId = searchParams.get('location_id') || '';
    const date = searchParams.get('date') || '';
    const endDate = searchParams.get('end_date') || '';
    const attendees = searchParams.get('attendees') || '';

    // Scroll to top when search params change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [searchParams]);

    // Fetch rooms with timeline data
    const { data, isLoading, error } = useQuery({
        queryKey: ['roomsWithTimeline', locationId, date, endDate, attendees],
        queryFn: () => api.getRoomsWithTimeline({
            date,
            end_date: endDate || undefined,
            location_id: locationId || undefined,
            attendees: attendees || undefined,
        }),
        enabled: !!date,
    });

    const handleCardClick = (entry) => {
        const params = new URLSearchParams();
        params.set('date', date);
        if (endDate) params.set('end_date', endDate);
        if (attendees) params.set('attendees', attendees);
        navigate(`/rooms/${entry.room.id}?${params.toString()}`);
    };

    const formatAmenity = (amenity) => {
        return amenity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition cursor-pointer shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Available Rooms</h1>
                </div>
            </div>

            {/* Summary Stats */}
            {data && (
                <div className="flex items-center gap-4 mb-8">
                    <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <span className="text-2xl font-bold text-slate-900">{data.meta.total_rooms}</span>
                        <span className="text-sm text-slate-500 ml-2">rooms found</span>
                    </div>
                    <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <span className="text-2xl font-bold text-emerald-600">{data.meta.fully_available}</span>
                        <span className="text-sm text-slate-500 ml-2">fully available</span>
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-mimos-500 animate-spin mb-3" />
                    <span className="text-slate-500 text-sm">Loading rooms...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="py-16 text-center">
                    <p className="text-red-500 text-sm mb-4">Failed to load rooms. Please try again.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-mimos-600 hover:text-mimos-700 font-medium transition cursor-pointer"
                    >
                        Back to search
                    </button>
                </div>
            )}

            {/* Empty State */}
            {data && data.rooms.length === 0 && (
                <div className="py-16 text-center">
                    <div className="text-5xl mb-4">🏢</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No rooms found</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Try adjusting your search criteria or selecting a different date.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 bg-gradient-to-r from-mimos-500 to-pink-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-mimos-500/25 transition cursor-pointer"
                    >
                        New Search
                    </button>
                </div>
            )}

            {/* Room Card Grid */}
            {data && data.rooms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.rooms.map((entry) => (
                        <RoomCard
                            key={entry.room.id}
                            room={entry.room}
                            onClick={() => handleCardClick(entry)}
                            formatAmenity={formatAmenity}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * RoomCard — A visually striking glass card showing the room image and basic details.
 */
function RoomCard({ room, onClick, formatAmenity }) {
    const availabilityText = room.available_slots === room.total_slots
        ? 'Fully Available'
        : room.available_slots === 0
            ? 'Fully Booked'
            : `${room.available_slots} of ${room.total_slots} slots available`;

    const availabilityColor = room.available_slots === room.total_slots
        ? 'text-emerald-700 bg-emerald-50/90 border-emerald-200/60'
        : room.available_slots === 0
            ? 'text-slate-400 bg-slate-50/80 border-slate-200/40'
            : 'text-amber-700 bg-amber-50/90 border-amber-200/60';

    return (
        <button
            onClick={onClick}
            disabled={room.available_slots === 0}
            className={`group text-left w-full bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-100/50 transition-all duration-300 cursor-pointer ${
                room.available_slots > 0
                    ? 'hover:scale-[1.02] hover:shadow-xl hover:shadow-mimos-500/5 hover:border-mimos-500/30'
                    : 'opacity-50 cursor-not-allowed'
            }`}
        >
            {/* Image container */}
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                    src={room.image_url || '/images/rooms/default.png'}
                    alt={room.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                {/* Availability badge overlay */}
                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm tracking-wide ${availabilityColor}`}>
                    {availabilityText}
                </div>
            </div>

            {/* Details */}
            <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-mimos-500 transition-colors">
                    {room.name}
                </h3>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 text-mimos-500" />
                        {room.location} ({room.location_code})
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Users className="w-3.5 h-3.5 text-mimos-500" />
                        Up to {room.capacity} pax
                    </span>
                </div>

                {/* Amenities list as micro-badges */}
                {room.amenities && room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100/80">
                        {room.amenities.map(formatAmenity).map((amenity, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 rounded-md bg-mimos-500/5 text-[9px] text-mimos-500 font-bold uppercase tracking-wider"
                            >
                                {amenity}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
}
