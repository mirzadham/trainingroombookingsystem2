import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthPromptModal from './AuthPromptModal';

/**
 * Generates an array of all half-hour slots from 07:00 to 19:00 (7 AM - 7 PM).
 */
const generateAllSlots = () => {
    const slots = [];
    for (let h = 7; h < 19; h++) {
        slots.push({
            time: `${h.toString().padStart(2, '0')}:00`,
            label: `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`,
        });
        slots.push({
            time: `${h.toString().padStart(2, '0')}:30`,
            label: `${h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`,
        });
    }
    // Final end boundary is 19:00, so we have exactly 24 slots to pick as START times.
    return slots;
};

const ALL_SLOTS = generateAllSlots();

export default function RoomTimeGrid({ room, date, endDate, attendees, timelineSlots }) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingRedirectUrl, setPendingRedirectUrl] = useState('');

    // Step 1 or Step 2
    const [step, setStep] = useState(1);

    // Selected times
    const [startTime, setStartTime] = useState(null);
    const [duration, setDuration] = useState(null); // in minutes (30, 60, 90, etc.)

    // Determine availability of each of the 24 slots based on the full timeline.
    // timelineSlots is an array of 30-min slots from backend. Usually 00:00 to 23:30 or similar.
    // For each slot in ALL_SLOTS, we check if it is 'available'.
    const getSlotStatus = (timeStr) => {
        if (!timelineSlots) return 'available';
        // Backend returns full datetime strings like "2026-05-20 07:00:00"
        // We need to extract just the HH:mm portion to compare with our "07:00" format
        const tSlot = timelineSlots.find(s => {
            const slotTime = s.start.includes(' ') 
                ? s.start.split(' ')[1].substring(0, 5)  // "2026-05-20 07:00:00" → "07:00"
                : s.start.includes('T')
                    ? s.start.split('T')[1].substring(0, 5)  // ISO format fallback
                    : s.start;
            return slotTime === timeStr;
        });
        return tSlot ? tSlot.status : 'available';
    };

    const handleStartTimeSelect = (slot) => {
        if (getSlotStatus(slot.time) === 'occupied') return;
        setStartTime(slot.time);
        setDuration(null);
        setStep(2);
    };

    // Calculate possible durations from the selected start time.
    const possibleDurations = useMemo(() => {
        if (!startTime || !timelineSlots) return [];

        const startIndex = ALL_SLOTS.findIndex(s => s.time === startTime);
        if (startIndex === -1) return [];

        const durations = [];
        let accumulatedMinutes = 0;

        for (let i = startIndex; i < ALL_SLOTS.length; i++) {
            const currentSlot = ALL_SLOTS[i];

            // If the slot itself is occupied, we cannot stretch duration into it
            if (getSlotStatus(currentSlot.time) === 'occupied') {
                break;
            }

            accumulatedMinutes += 30;

            // End time string for display (this is the boundary *after* the slot)
            let endH = parseInt(currentSlot.time.substring(0, 2));
            let endM = parseInt(currentSlot.time.substring(3, 5)) + 30;
            if (endM === 60) {
                endM = 0;
                endH += 1;
            }

            const endLabel = `${endH > 12 ? endH - 12 : endH === 0 ? 12 : endH}:${endM === 0 ? '00' : '30'} ${endH >= 12 && endH < 24 ? 'PM' : 'AM'}`;
            const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
            const durationLabel = accumulatedMinutes >= 60 ? (accumulatedMinutes / 60) + ' hr' : accumulatedMinutes + ' min';

            durations.push({
                minutes: accumulatedMinutes,
                endTimeStr,
                endLabel,
                durationLabel,
                label: `UNTIL ${endLabel} (${durationLabel})`
            });
        }
        return durations;
    }, [startTime, timelineSlots]);

    const handleDurationSelect = (dur) => {
        setDuration(dur);
    };

    const handleBookNow = () => {
        if (!startTime || !duration) return;

        // Ensure any previous draft is cleared when starting a brand new booking
        const keysToRemove = ['room', 'step', 'title', 'description', 'attendees', 'endDate', 'guestName', 'guestEmail', 'phone'];
        keysToRemove.forEach(k => sessionStorage.removeItem(`booking_draft_${k}`));

        // Pass info via React Router state (fallback, though useBookingForm will use sessionStorage too if we set it there)
        const locationName = typeof room.location === 'object' ? room.location?.name : room.location;
        let url = `/book?room_id=${room.id}&room_name=${encodeURIComponent(room.name)}&location=${encodeURIComponent(locationName || '')}&capacity=${room.capacity}&date=${date}&start_time=${startTime}&end_time=${duration.endTimeStr}`;
        if (endDate) {
            url += `&end_date=${endDate}`;
        }
        if (attendees) {
            url += `&attendees=${encodeURIComponent(attendees)}`;
        }

        if (!isAuthenticated) {
            setPendingRedirectUrl(url);
            setShowAuthModal(true);
            return;
        }

        navigate(url);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                {step === 2 && (
                    <button
                        onClick={() => { setStep(1); setStartTime(null); setDuration(null); }}
                        className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                        {step === 1 ? '1. Select Start Time' : '2. Select Duration'}
                    </h3>
                    <p className="text-xs text-slate-500">
                        {step === 1 ? 'Choose when your meeting begins' : `Starting at ${ALL_SLOTS.find(s => s.time === startTime)?.label}`}
                    </p>
                    {endDate && (
                        <p className="text-[10px] text-mimos-600 font-bold mt-0.5 animate-pulse">
                            📅 Booking range: {date} to {endDate}
                        </p>
                    )}
                </div>
            </div>

            {/* Grid Area */}
            <div className="p-4 flex-1 overflow-y-auto">
                {step === 1 && (
                    <div className="grid grid-cols-4 gap-2">
                        {ALL_SLOTS.map((slot, i) => {
                            const status = getSlotStatus(slot.time);
                            const isOccupied = status === 'occupied';

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleStartTimeSelect(slot)}
                                    disabled={isOccupied}
                                    className={`
                                        py-2.5 rounded-xl text-xs font-medium transition-all border
                                        ${isOccupied
                                            ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-mimos-500 hover:text-mimos-600 hover:shadow-sm cursor-pointer'
                                        }
                                    `}
                                >
                                    {slot.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {step === 2 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        {possibleDurations.map((dur, i) => (
                            <button
                                key={i}
                                onClick={() => handleDurationSelect(dur)}
                                className={`
                                    flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all
                                    ${duration?.minutes === dur.minutes
                                        ? 'bg-mimos-50 border-mimos-500 text-mimos-700 ring-1 ring-mimos-500 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-mimos-400 hover:bg-slate-50 cursor-pointer'
                                    }
                                `}
                            >
                                <span className="text-xs font-semibold">{dur.durationLabel}</span>
                                <span className="text-[10px] opacity-70 mt-0.5">Until {dur.endLabel}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-slate-200 bg-white">
                <button
                    onClick={handleBookNow}
                    disabled={step === 1 || !duration}
                    className={`
                        w-full py-3 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2
                        ${step === 2 && duration
                            ? 'bg-gradient-to-r from-mimos-500 to-pink-600 text-white shadow-lg shadow-mimos-500/25 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }
                    `}
                >
                    Book Now
                </button>
            </div>

            {/* Auth Gate Modal Popup */}
            <AuthPromptModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
                redirectUrl={pendingRedirectUrl} 
            />
        </div>
    );
}
