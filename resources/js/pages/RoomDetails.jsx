import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Users, Loader2, Monitor, Wifi, Coffee, Maximize, ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import * as api from '../services/api';
import RoomTimeGrid from '../components/RoomTimeGrid';
import { assetPath } from '../utils/basePath';

/**
 * Helper to deterministically generate 5 room photo URLs using existing assets.
 */
function getRoomImages(room) {
    if (!room) return [];
    
    // Prioritize real uploaded images array if available
    if (room.images && room.images.length > 0) {
        if (room.images.length >= 5) {
            return room.images.slice(0, 5).map(img => assetPath(img)); // Take up to first 5
        }
        
        // If we have fewer than 5 images, pad them with default placeholders to preserve the 5-photo grid layout
        const photos = [...room.images];
        const allImages = [
            '/images/rooms/seminar-room-a.png',
            '/images/rooms/training-lab-1.png',
            '/images/rooms/meeting-room-b1.png',
            '/images/rooms/boardroom.png',
            '/images/rooms/collaboration-space.png',
            '/images/rooms/innovation-lab.png',
            '/images/rooms/meeting-room-k1.png',
            '/images/rooms/training-hall.png'
        ];
        
        const otherImages = allImages.filter(img => !photos.includes(img));
        let i = 0;
        while (photos.length < 5 && i < otherImages.length) {
            photos.push(otherImages[i]);
            i++;
        }
        return photos.map(img => assetPath(img));
    }
    
    // Fallback if no images array is returned from backend
    const mainImg = room.image_url || '/images/rooms/default.png';
    const allImages = [
        '/images/rooms/seminar-room-a.png',
        '/images/rooms/training-lab-1.png',
        '/images/rooms/meeting-room-b1.png',
        '/images/rooms/boardroom.png',
        '/images/rooms/collaboration-space.png',
        '/images/rooms/innovation-lab.png',
        '/images/rooms/meeting-room-k1.png',
        '/images/rooms/training-hall.png'
    ];
    
    const otherImages = allImages.filter(img => img !== mainImg);
    
    const roomId = room.id || 0;
    const img2 = otherImages[roomId % otherImages.length];
    const img3 = otherImages[(roomId + 1) % otherImages.length];
    const img4 = otherImages[(roomId + 2) % otherImages.length];
    const img5 = otherImages[(roomId + 3) % otherImages.length];
    
    return [mainImg, img2, img3, img4, img5].map(img => assetPath(img));
}

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

    // Lightbox modal states
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Default to today if no date provided
    const defaultDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    const date = searchParams.get('date') || defaultDate;
    const endDate = searchParams.get('end_date') || '';
    const attendees = searchParams.get('attendees') || '';

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

    // Scroll to top when loaded
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-4" />
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

    const photos = getRoomImages(room);
    const galleryImages = room.images && room.images.length > 0 ? room.images.map(img => assetPath(img)) : photos;

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

            {/* Airbnb-style photo grid at the top */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <div className="relative w-full">
                    <div 
                        className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-3xl overflow-hidden shadow-md h-[300px] lg:h-[450px]"
                        style={{ gridTemplateRows: 'repeat(2, 1fr)' }}
                    >
                        {/* On desktop: flat 4-col × 2-row grid; primary spans left half, 4 thumbs fill right half */}
                        {/* On mobile: only the primary image is shown */}

                        {/* Primary Large Image */}
                        <div 
                            className="lg:col-span-2 lg:row-span-2 relative overflow-hidden bg-slate-200 cursor-pointer group/primary"
                            onClick={() => {
                                setLightboxIndex(0);
                                setIsLightboxOpen(true);
                            }}
                        >
                            <img 
                                src={photos[0]} 
                                alt={`${room.name} Primary`}
                                className="w-full h-full object-cover group-hover/primary:scale-[1.02] transition-transform duration-500"
                            />
                            {/* Glass Location Badge on desktop */}
                            <div className="absolute bottom-6 left-6 text-white z-10">
                                <span className="px-3 py-1 bg-black/30 backdrop-blur-md rounded-full text-xs font-semibold border border-white/20">
                                    {room.location?.code}
                                </span>
                            </div>
                        </div>

                        {/* 4 smaller images — each occupies exactly one grid cell */}
                        {photos.slice(1, 5).map((photo, idx) => (
                            <div 
                                key={idx} 
                                className="hidden lg:block relative overflow-hidden bg-slate-200 cursor-pointer group/thumb"
                                onClick={() => {
                                    setLightboxIndex(idx + 1);
                                    setIsLightboxOpen(true);
                                }}
                            >
                                <img 
                                    src={photo} 
                                    alt={`${room.name} View ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover/thumb:scale-[1.03] transition-transform duration-500"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Show All Photos Button (bottom right corner) */}
                    <button
                        onClick={() => {
                            setLightboxIndex(0);
                            setIsLightboxOpen(true);
                        }}
                        className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/95 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-md hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer z-20"
                    >
                        <LayoutGrid className="w-4 h-4 text-slate-600" />
                        Show all photos
                    </button>
                </div>
            </div>

            {/* Bottom details and booking layout */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    
                    {/* Left Column: Presentation */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Title & Core Details */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                                {room.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {room.location?.name}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <Users className="w-4 h-4 text-slate-400" />
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
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <RoomTimeGrid 
                                room={room} 
                                date={date} 
                                endDate={endDate}
                                attendees={attendees}
                                timelineSlots={slots} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen Lightbox Modal */}
            {isLightboxOpen && createPortal(
                <div 
                    className="fixed inset-0 bg-black/95 flex flex-col justify-between p-6 pb-10 select-none animate-fade-in"
                    style={{ zIndex: 999999 }}
                >
                    {/* Top bar */}
                    <div className="flex items-center justify-between w-full text-white pb-4 border-b border-white/10">
                        <span className="text-sm font-semibold text-slate-300">
                            {lightboxIndex + 1} / {galleryImages.length}
                        </span>
                        <button 
                            onClick={() => setIsLightboxOpen(false)}
                            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                            aria-label="Close gallery"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Main large image with arrows */}
                    <div className="relative flex items-center justify-center flex-1 py-4 min-h-0">
                        <button 
                            onClick={() => setLightboxIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                            className="absolute left-2 md:left-6 p-3 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/10 rounded-full transition shadow-lg active:scale-95 cursor-pointer z-10"
                            aria-label="Previous photo"
                        >
                            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                        </button>

                        <img 
                            src={galleryImages[lightboxIndex]} 
                            alt={`${room.name} Large Gallery View`}
                            className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl transition-all duration-300"
                        />

                        <button 
                            onClick={() => setLightboxIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                            className="absolute right-2 md:right-6 p-3 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/10 rounded-full transition shadow-lg active:scale-95 cursor-pointer z-10"
                            aria-label="Next photo"
                        >
                            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                        </button>
                    </div>

                    {/* Bottom thumbnail selector strip */}
                    <div className="flex flex-col items-center justify-center gap-4 border-t border-white/10 pt-4">
                        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto max-w-full py-2 px-4 no-scrollbar">
                            {galleryImages.map((photo, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setLightboxIndex(idx)}
                                    className={`relative w-16 h-10 md:w-20 md:h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                                        idx === lightboxIndex ? 'border-mimos-500 scale-105 shadow-md shadow-mimos-500/20' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-102'
                                    }`}
                                >
                                    <img 
                                        src={photo} 
                                        alt={`Thumbnail ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider select-none pb-2">
                            {room.name}
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
