import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, MapPin, ArrowRight, Clock } from 'lucide-react';

/**
 * RoomDrawer — A premium side-sheet that slides in from the right.
 * Shows room details, image, amenities, and an interactive vertical timeline
 * where users click to select their booking time range.
 *
 * Props:
 *   room: { id, name, capacity, location, location_code, amenities, description, image_url, available_slots, total_slots }
 *   slots: [{ start, end, label, status, booking_title }]
 *   date: string (YYYY-MM-DD)
 *   isOpen: boolean
 *   onClose: () => void
 */
export default function RoomDrawer({ room, slots, date, isOpen, onClose }) {
    const navigate = useNavigate();
    const [selStart, setSelStart] = useState(null);
    const [selEnd, setSelEnd] = useState(null);

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Reset selection when room changes or drawer closes
    useEffect(() => {
        setSelStart(null);
        setSelEnd(null);
    }, [room?.id, isOpen]);

    // Reset end selection if start changes
    useEffect(() => {
        setSelEnd(null);
    }, [selStart]);

    // Calculate valid end times dynamically
    const availableEndOptions = useMemo(() => {
        if (selStart === null) return [];

        const options = [];
        let currentDurationMins = 0;

        for (let i = selStart; i < slots.length; i++) {
            if (slots[i].status === 'occupied') break;

            currentDurationMins += 30;
            const endDateTime = new Date(slots[i].end);
            const timeString = endDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();

            let durationString = '';
            if (currentDurationMins < 60) {
                durationString = `${currentDurationMins} mins`;
            } else {
                const hrs = currentDurationMins / 60;
                durationString = Number.isInteger(hrs) ? `${hrs} hr${hrs > 1 ? 's' : ''}` : `${hrs.toFixed(1)} hrs`;
            }

            options.push({
                index: i,
                timeLabel: timeString,
                durationLabel: durationString
            });
        }
        return options;
    }, [selStart, slots]);

    // Compute the selected time range text
    const selectedTimeRange = useMemo(() => {
        if (selStart === null || selEnd === null) return null;
        const startSlot = slots[selStart];
        const endSlot = slots[selEnd];
        if (!startSlot || !endSlot) return null;
        return {
            start: startSlot.start,
            end: endSlot.end,
            startLabel: startSlot.label,
            endLabel: new Date(endSlot.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase(),
        };
    }, [selStart, selEnd, slots]);

    const handleConfirmBooking = () => {
        if (!selectedTimeRange || !room) return;
        const params = new URLSearchParams({
            room_id: room.id,
            room_name: room.name,
            location: room.location_code,
            capacity: room.capacity,
            start_time: selectedTimeRange.start,
            end_time: selectedTimeRange.end,
            date,
        });
        navigate(`/book?${params.toString()}`);
    };

    const formatAmenity = (amenity) => {
        return amenity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (!room) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 ${isOpen
                    ? 'bg-black/40 backdrop-blur-sm opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[560px] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-md shadow-lg hover:bg-white transition cursor-pointer"
                    >
                        <X className="w-5 h-5 text-slate-700" />
                    </button>

                    {/* Hero Image */}
                    <div className="relative w-full aspect-[16/10] overflow-hidden">
                        <img
                            src={room.image_url || '/images/rooms/default.png'}
                            alt={room.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>

                    {/* Room Info */}
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{room.name}</h2>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="flex items-center gap-1.5 text-sm text-slate-500">
                                <MapPin className="w-4 h-4" />
                                {room.location} ({room.location_code})
                            </span>
                            <span className="flex items-center gap-1.5 text-sm text-slate-500">
                                <Users className="w-4 h-4" />
                                Up to {room.capacity} pax
                            </span>
                        </div>

                        {room.description && (
                            <p className="text-sm text-slate-600 leading-relaxed mb-4">{room.description}</p>
                        )}

                        {/* Amenities */}
                        {room.amenities && room.amenities.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Amenities</h3>
                                <p className="text-sm text-slate-600">
                                    {room.amenities.map(formatAmenity).join(', ')}
                                </p>
                            </div>
                        )}

                        {/* Timeline Selection Area */}
                        <div className="mt-8">
                            {/* Step 1: Start Time */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        1. Select Start Time
                                    </h3>
                                    {selStart !== null && (
                                        <button
                                            onClick={() => { setSelStart(null); setSelEnd(null); }}
                                            className="text-[11px] text-mimos-600 font-bold hover:text-mimos-700 uppercase tracking-wider"
                                        >
                                            Change
                                        </button>
                                    )}
                                </div>

                                {selStart === null ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {slots.map((slot, i) => {
                                            const isOccupied = slot.status === 'occupied';
                                            return (
                                                <button
                                                    key={i}
                                                    disabled={isOccupied}
                                                    onClick={() => setSelStart(i)}
                                                    className={`px-1 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-200 border ${isOccupied
                                                        ? 'bg-slate-50 border-transparent text-slate-400 opacity-60 cursor-not-allowed'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-mimos-300 hover:text-mimos-600 shadow-sm hover:shadow-md hover:shadow-mimos-500/10 cursor-pointer'
                                                        }`}
                                                >
                                                    {slot.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 bg-mimos-50 border border-mimos-100 rounded-xl transition-all duration-300">
                                        <div className="w-8 h-8 rounded-full bg-mimos-100 flex items-center justify-center text-mimos-600 shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-mimos-600/70 tracking-wider">Start Time</div>
                                            <div className="text-sm font-bold text-slate-900">{slots[selStart].label}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: End Time / Duration */}
                            {selStart !== null && (
                                <div className="transition-all duration-500 ease-out origin-top">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            2. Select Duration
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {availableEndOptions.map((opt) => {
                                            const isSelected = selEnd === opt.index;
                                            return (
                                                <button
                                                    key={opt.index}
                                                    onClick={() => setSelEnd(opt.index)}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${isSelected
                                                        ? 'bg-gradient-to-br from-mimos-500 to-pink-600 border-transparent text-white shadow-lg shadow-mimos-500/30 ring-2 ring-mimos-500 ring-offset-1'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-mimos-300 hover:text-mimos-600 shadow-sm hover:shadow-md hover:shadow-mimos-500/10'
                                                        }`}
                                                >
                                                    <span className={`text-[10px] font-bold tracking-wider mb-1 ${isSelected ? 'text-white/100' : 'text-slate-400'}`}>
                                                        UNTIL {opt.timeLabel}
                                                    </span>
                                                    <span className="text-sm font-bold">
                                                        {opt.durationLabel}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sticky Footer — appears when time is selected */}
                {selectedTimeRange && (
                    <div className="border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Selected Time</div>
                                <div className="text-sm font-semibold text-slate-900">
                                    {selectedTimeRange.startLabel} — {selectedTimeRange.endLabel}
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelStart(null); setSelEnd(null); }}
                                className="text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            >
                                Clear
                            </button>
                        </div>
                        <button
                            onClick={handleConfirmBooking}
                            className="group w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-mimos-500/25 hover:shadow-mimos-500/40 transition-all duration-300 cursor-pointer"
                        >
                            Confirm Booking
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
