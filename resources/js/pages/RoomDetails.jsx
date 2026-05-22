import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Users, Loader2, Monitor, Wifi, Coffee, Maximize } from 'lucide-react';
import * as api from '../services/api';
import RoomTimeGrid from '../components/RoomTimeGrid';

// Fallback icon mapping for amenities
const getAmenityIcon = (amenity) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('projector') || lower.includes('screen')) return <Monitor className="w-4 h-4" />;
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="w-4 h-4" />;
    if (lower.includes('coffee') || lower.includes('tea')) return <Coffee className="w-4 h-4" />;
    return <Maximize className="w-4 h-4" />;
};

const formatAmenity = (amenity) => {
    return amenity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function RoomDetails() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Default to today if no date provided
    const defaultDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    const date = searchParams.get('date') || defaultDate;
    const endDate = searchParams.get('end_date') || '';

    // Fetch basic room details
    const { data: roomData, isLoading: isRoomLoading, error: roomError } = useQuery({
        queryKey: ['room', id],
        queryFn: () => api.getPublicRoom(id),
        enabled: !!id,
    });

    // Fetch timeline availability for all rooms to extract slots for THIS room
    const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
        queryKey: ['roomsWithTimeline', date, endDate],
        queryFn: () => api.getRoomsWithTimeline({ date, end_date: endDate || undefined }),
        enabled: !!date,
    });

    const isLoading = isRoomLoading || isTimelineLoading;
    const room = roomData;

    // Extract slots for the current room
    const timelineEntry = timelineData?.rooms?.find(r => r.room.id === parseInt(id));
    const slots = timelineEntry?.slots || null;

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-mimos-500 animate-spin mb-4" />
                <p className="text-slate-500 text-sm font-medium">Loading room details...</p>
            </div>
        );
    }

    if (roomError || !room) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-slate-200">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        🚨
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Room not found</h2>
                    <p className="text-slate-500 text-sm mb-6">The room you are looking for does not exist or is currently inactive.</p>
                    <button 
                        onClick={() => navigate('/search')}
                        className="px-6 py-2.5 bg-mimos-500 text-white font-medium rounded-xl hover:bg-mimos-600 transition shadow-sm w-full"
                    >
                        Return to Search
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Top Navigation */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition font-medium group cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Search Results
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    
                    {/* Left Column: Presentation */}
                    <div className="flex-1 space-y-8">
                        {/* Premium Image */}
                        <div className="w-full aspect-[16/10] md:aspect-[21/9] lg:aspect-[16/10] rounded-3xl overflow-hidden bg-slate-200 shadow-md relative">
                            <img 
                                src={room.image_url || '/images/rooms/default.png'} 
                                alt={room.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            <div className="absolute bottom-6 left-6 text-white">
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium border border-white/30">
                                {room.location?.code}
                                </span>
                            </div>
                        </div>

                        {/* Title & Core Details */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                                {room.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <MapPin className="w-4 h-4 text-mimos-500" />
                                    {room.location?.name}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <Users className="w-4 h-4 text-mimos-500" />
                                    Up to {room.capacity} pax
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">About this room</h3>
                            <p className="text-slate-600 leading-relaxed">
                                {room.description || 'A premium training room equipped with modern amenities to ensure a productive and comfortable environment for all your meetings and training sessions. Designed with professional acoustics and high-speed connectivity.'}
                            </p>
                        </div>

                        {/* Amenities List */}
                        {room.amenities && room.amenities.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Included Amenities</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {room.amenities.map((amenity, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                            <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                                                {getAmenityIcon(amenity)}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">
                                                {formatAmenity(amenity)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Interaction */}
                    <div className="w-full lg:w-[420px] shrink-0">
                        <div className="sticky top-8">
                            <RoomTimeGrid 
                                room={room} 
                                date={date} 
                                endDate={endDate}
                                timelineSlots={slots} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
