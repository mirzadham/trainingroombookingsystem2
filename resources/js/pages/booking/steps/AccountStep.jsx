import React from 'react';
import { 
    Clock, CheckCircle2, ArrowRight, FileText, ArrowLeft, User
} from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

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

/**
 * AccountStep (Redesigned as Review & Confirm Dashboard)
 * 
 * Displays a gorgeous, responsive, card-based overview of the booking details
 * so the user can verify their dates, times, and purpose before submitting.
 * 
 * - Full Name and Email are read-only to prevent messy local profile overrides.
 * - Phone Number remains editable so they can customize event-specific contacts.
 * - Displays a fallback layout for guest checkout in case they bypass upfront auth.
 */
export default function AccountStep({ form }) {
    const { 
        guestName, setGuestName, 
        guestEmail, setGuestEmail, 
        phone, setPhone, 
        isAuthenticated, 
        canProceedToAuthOrSubmit, 
        handleNext,
        submitting,
        updateProfileOnSubmit, setUpdateProfileOnSubmit,
        title, description, attendees, endDate,
        roomInfo, formatTime, formatDate, setStep
    } = form;

    // Prioritize actual dynamic image URL passed from search/details view
    const roomIdVal = parseInt(roomInfo.roomId) || 0;
    const roomImage = roomInfo.imageUrl || allImages[roomIdVal % allImages.length];

    // Helper to calculate exact duration between start and end times
    const calculateDuration = (start, end) => {
        if (!start || !end) return '';
        try {
            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);
            let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
            if (diffMins < 0) diffMins += 24 * 60;
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
            if (hrs > 0) return `${hrs}h`;
            return `${mins}m`;
        } catch (e) {
            return '';
        }
    };
    const durationStr = calculateDuration(roomInfo.startTime, roomInfo.endTime);

    // FALLBACK LAYOUT: Only shown if unauthenticated (e.g., direct URL bypass)
    if (!isAuthenticated) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Your Details</h2>
                    <p className="text-sm text-slate-500 mt-1">Please provide your contact details for this booking.</p>
                </div>

                <div className="space-y-5">
                    <Input
                        label="Full Name *"
                        type="text"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="John Doe"
                    />

                    <Input
                        label="Email Address *"
                        type="email"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        placeholder="john@example.com"
                    />

                    <Input
                        label="Phone Number *"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+60 12 345 6789"
                    />
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <button
                        onClick={() => setStep(0)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold transition shadow-sm cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <Button
                        onClick={handleNext}
                        disabled={!canProceedToAuthOrSubmit || submitting}
                        loading={submitting}
                        size="lg"
                        className="flex-1 max-w-xl group py-3 text-base"
                    >
                        Next Step
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        );
    }

    // PREMIUM LAYOUT: Authenticated "Review & Confirm" Dashboard
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Step Heading */}
            <div className="flex items-start gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review your booking</h2>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                        Please verify your meeting schedule and contact details before final submission.
                    </p>
                </div>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Room Schedule & Meeting Information */}
                <div className="space-y-6">
                    {/* Schedule Details Card */}
                    <div className="bg-white border border-slate-200/60 rounded-3xl p-6 space-y-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
                            <Clock className="w-5 h-5" />
                            <span>Room & Schedule</span>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Room image & main details */}
                            <div className="flex items-start gap-4">
                                <div className="w-24 h-16 sm:w-28 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-100 shadow-sm bg-slate-100">
                                    <img 
                                        src={roomImage} 
                                        alt={roomInfo.roomName || 'Room'} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">{roomInfo.roomName || 'Unknown Room'}</h4>
                                    <div className="text-xs text-slate-500 font-semibold mt-1">
                                        {roomInfo.location || 'Unknown Location'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="h-px bg-slate-100" />
                            
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Date</span>
                                    <span className="text-sm font-bold text-slate-800 block">
                                        {endDate && endDate !== roomInfo.date
                                            ? `${formatDate(roomInfo.date)} — ${formatDate(endDate)}`
                                            : formatDate(roomInfo.date)
                                        }
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Time</span>
                                    <span className="text-sm font-bold text-slate-800 block">
                                        {formatTime(roomInfo.startTime)} – {formatTime(roomInfo.endTime)}
                                    </span>
                                    {durationStr && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold mt-1">
                                            {durationStr}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Meeting Information Card */}
                    <div className="bg-white border border-slate-200/60 rounded-3xl p-6 space-y-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
                            <FileText className="w-5 h-5" />
                            <span>Meeting Information</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Purpose / Title</span>
                                <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm shadow-slate-100/40">
                                    {title || '-'}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between gap-4 pt-1">
                                <div>
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Room Capacity Limit</span>
                                    <span className="text-xs font-bold text-slate-700 block mt-1">Up to {roomInfo.capacity} pax</span>
                                </div>
                                <div className="bg-white border border-slate-200/60 rounded-full px-4 py-1.5 shadow-sm text-xs font-extrabold text-slate-800 shrink-0">
                                    {attendees} Attendees
                                </div>
                            </div>
                            
                            {description && (
                                <div className="space-y-1.5 pt-1">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Description / Notes</span>
                                    <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm shadow-slate-100/40 line-clamp-3">
                                        {description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Contact Details & Verified Info Banner */}
                <div className="space-y-6">
                    {/* Contact details card */}
                    <div className="bg-white border border-slate-200/60 rounded-3xl p-6 space-y-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
                            <User className="w-5 h-5" />
                            <span>Booking Contact</span>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Read-Only Booked by block */}
                            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm shadow-slate-100/40">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Booked by</span>
                                <span className="text-sm font-bold text-slate-800 block mt-1">{guestName}</span>
                            </div>

                            {/* Read-Only Email block */}
                            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm shadow-slate-100/40">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Email address</span>
                                <span className="text-sm font-bold text-slate-800 block break-all mt-1">{guestEmail}</span>
                            </div>

                            {/* Coordinator contact phone input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-0.5">
                                    Coordinator contact phone
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="Phone Number"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-mimos-500/20 focus:border-mimos-500 shadow-sm transition"
                                />
                                <p className="text-[10px] text-slate-400 leading-normal px-0.5">
                                    Customize this if the coordinator's phone number differs from your profile phone.
                                </p>
                            </div>

                            {/* Save to profile checkbox */}
                            <label className="flex items-start gap-3.5 p-4 bg-white hover:bg-slate-50/55 border border-slate-200/60 rounded-2xl cursor-pointer select-none transition group shadow-sm shadow-slate-100/40">
                                <input
                                    type="checkbox"
                                    checked={updateProfileOnSubmit}
                                    onChange={e => setUpdateProfileOnSubmit(e.target.checked)}
                                    className="w-4.5 h-4.5 mt-0.5 rounded text-mimos-500 focus:ring-mimos-500 border-slate-300 transition cursor-pointer"
                                />
                                <div className="text-left">
                                    <span className="block text-xs font-bold text-slate-700 group-hover:text-slate-900 transition leading-tight">
                                        Save phone updates to my profile
                                    </span>
                                    <span className="block text-[9px] text-slate-400 mt-1 leading-normal">
                                        Keep your persistent contact settings synchronized with these updates.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Verified Banner */}
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-5 shadow-sm shadow-emerald-50/20">
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900 border-b border-emerald-100/50 pb-2.5">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Information verified</span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-3 leading-relaxed">
                            Once submitted, this room booking request will be routed to the location administrators for review. You can track its status in the "My Bookings" tab.
                        </p>
                    </div>
                </div>

            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
                <button
                    onClick={() => setStep(0)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-55 hover:border-slate-300 rounded-2xl font-bold transition shadow-sm cursor-pointer active:scale-98"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                <Button
                    onClick={handleNext}
                    disabled={!canProceedToAuthOrSubmit || submitting}
                    loading={submitting}
                    size="lg"
                    className="flex-1 max-w-xl group py-3.5 text-base bg-gradient-to-r from-mimos-500 via-pink-500 to-indigo-500 hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.005] duration-200 transition-all cursor-pointer shadow-lg shadow-mimos-500/20"
                >
                    Confirm & Submit Booking
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
            </div>
        </div>
    );
}
