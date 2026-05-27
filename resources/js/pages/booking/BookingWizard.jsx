import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, Check, Calendar } from 'lucide-react';
import useBookingForm from './hooks/useBookingForm';
import DetailsStep from './steps/DetailsStep';
import AccountStep from './steps/AccountStep';
import ConfirmationStep from './steps/ConfirmationStep';

const STEPS = ['Details', 'Review Booking', 'Confirm'];

/**
 * BookingWizard — Orchestrator component for the multi-step booking flow.
 * Responsive layout containing a full-width stepper indicator at the top.
 * - Step 1: Two-column layout (Booking details form on left, Live booking summary on right).
 * - Step 2 & 3: Centered, single-column card layouts (no live summary).
 */
export default function BookingWizard() {
    const navigate = useNavigate();
    const form = useBookingForm();
    const { step, setStep, roomInfo, error, formatTime, formatDate } = form;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 animate-in fade-in duration-500">
            {/* Header / Back button */}
            <div className="mb-8">
                <button
                    onClick={() => step > 0 && step < 2 ? setStep(s => s - 1) : navigate(-1)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition font-medium group cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {step > 0 && step < 2 ? 'Back' : 'Back to search'}
                </button>
            </div>

            {/* Step indicator - full length at the top */}
            <div className="flex items-center w-full mb-12 bg-white/70 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/50 shadow-md shadow-slate-100/50 animate-in fade-in slide-in-from-top-4 duration-500">
                {STEPS.map((label, i) => {
                    const isActive = i === step;
                    const isCompleted = i < step;
                    const displayNum = i + 1;
                    
                    return (
                        <React.Fragment key={label}>
                            <div className={`flex items-center gap-2.5 text-xs font-bold shrink-0 transition-colors duration-300 ${isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                                    isCompleted ? 'bg-mimos-500 text-white shadow-md shadow-mimos-500/20' :
                                    isActive ? 'bg-white border-2 border-mimos-500 text-mimos-500 shadow-md shadow-mimos-500/10' :
                                    'bg-slate-50 border border-slate-200/80 text-slate-400'
                                }`}>
                                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : displayNum}
                                </div>
                                <span className="hidden sm:inline tracking-wider uppercase text-[10px]">{label}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-[2px] mx-3 sm:mx-5 rounded-full ${isCompleted ? 'bg-mimos-500' : 'bg-slate-200'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="w-full">
                {step === 0 ? (
                    /* Step 1: Two-column layout (Form Left, Live Summary Right) */
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start w-full">
                        {/* Left Column: Booking details form */}
                        <div className="flex-1 w-full lg:max-w-2xl">
                            {error && (
                                <div className="mb-8 p-4 rounded-2xl bg-red-50/50 border border-red-100/80 text-red-600 text-sm flex items-start gap-3 shadow-sm">
                                    <div className="mt-0.5 text-lg">🚨</div>
                                    <div className="flex-1 font-semibold">{error}</div>
                                </div>
                            )}

                            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-200/50 p-6 sm:p-8">
                                <DetailsStep form={form} />
                            </div>
                        </div>

                        {/* Right Column: Sticky Live Summary */}
                        <div className="w-full lg:w-[380px] shrink-0 sticky top-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl shadow-slate-200/60 rounded-3xl overflow-hidden relative">
                                <div className="absolute top-0 left-0 right-0 h-[3px] bg-mimos-500" />
                                <div className="bg-slate-50/50 border-b border-slate-200/50 p-6">
                                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-1">Booking Summary</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">Verify details before confirming</p>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    {/* Room Details */}
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900 mb-1">{roomInfo.roomName || 'Unknown Room'}</h4>
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                                            <MapPin className="w-4.5 h-4.5 text-mimos-500" />
                                            {roomInfo.location || 'Unknown Location'}
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100" />

                                    {/* Date & Time */}
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-mimos-500/5 text-mimos-500 rounded-xl shrink-0 border border-mimos-500/10">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                                    {form.endDate && form.endDate !== roomInfo.date ? 'Dates' : 'Date'}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-800">
                                                    {form.endDate && form.endDate !== roomInfo.date
                                                        ? `${formatDate(roomInfo.date)} — ${formatDate(form.endDate)}`
                                                        : formatDate(roomInfo.date)
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-mimos-500/5 text-mimos-500 rounded-xl shrink-0 border border-mimos-500/10">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Time</div>
                                                <div className="text-sm font-semibold text-slate-800">
                                                    {formatTime(roomInfo.startTime)} – {formatTime(roomInfo.endTime)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 bg-mimos-500/5 text-mimos-500 rounded-xl shrink-0 border border-mimos-500/10">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Capacity limit</div>
                                                <div className="text-sm font-semibold text-slate-800">Up to {roomInfo.capacity} pax</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Form Data */}
                                    {(form.title || form.attendees) && (
                                        <>
                                            <div className="h-px bg-slate-100" />
                                            <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4 space-y-4">
                                                {form.title && (
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purpose</div>
                                                        <div className="text-sm text-slate-700 font-medium line-clamp-2 leading-relaxed">{form.title}</div>
                                                    </div>
                                                )}
                                                
                                                {form.title && form.attendees && <div className="h-px bg-slate-200/60" />}
                                                
                                                {form.attendees && (
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Attendees</div>
                                                        <div className="text-sm text-slate-700 font-semibold">{form.attendees} people</div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {/* Visual Footer */}
                                <div className="h-1.5 bg-mimos-600" />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Step 2 & 3: Centered, single-column card layouts */
                    <div className={`w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                        step === 1 ? 'max-w-4xl' : 'max-w-2xl'
                    }`}>
                        {error && (
                            <div className="mb-8 p-4 rounded-2xl bg-red-50/50 border border-red-100/80 text-red-600 text-sm flex items-start gap-3 shadow-sm">
                                <div className="mt-0.5 text-lg">🚨</div>
                                <div className="flex-1 font-semibold">{error}</div>
                            </div>
                        )}

                        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-200/50 p-6 sm:p-8">
                            {step === 1 && <AccountStep form={form} />}
                            {step === 2 && <ConfirmationStep form={form} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
