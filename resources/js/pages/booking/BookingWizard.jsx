import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, Check, Calendar } from 'lucide-react';
import useBookingForm from './hooks/useBookingForm';
import DetailsStep from './steps/DetailsStep';
import AccountStep from './steps/AccountStep';
import AuthGateStep from './steps/AuthGateStep';
import ConfirmationStep from './steps/ConfirmationStep';

const STEPS = ['Details', 'Account', 'Verify', 'Confirm'];

/**
 * BookingWizard — Orchestrator component for the multi-step booking flow.
 * Uses a 2-column layout with a Sticky Live Summary on the right.
 */
export default function BookingWizard() {
    const navigate = useNavigate();
    const form = useBookingForm();
    const { step, setStep, roomInfo, error, isAuthenticated, formatTime, formatDate } = form;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
            {/* Header / Back button */}
            <div className="mb-8">
                <button
                    onClick={() => step > 0 && step < 3 ? setStep(s => s - 1) : navigate(-1)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition font-medium group cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {step > 0 && step < 3 ? 'Back' : 'Back to search'}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                {/* Left Column: Wizard Steps */}
                <div className="flex-1 w-full max-w-2xl">
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-10">
                        {STEPS.map((label, i) => {
                            // Don't show AuthGate as a real step if authenticated (it gets skipped)
                            if (isAuthenticated && i === 2) return null;
                            
                            const isActive = i === step;
                            const isCompleted = i < step;
                            
                            return (
                                <React.Fragment key={label}>
                                    <div className={`flex items-center gap-2 text-xs font-medium ${isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                                            isCompleted ? 'bg-mimos-500 text-white shadow-sm' :
                                            isActive ? 'bg-mimos-50 text-mimos-600 ring-2 ring-mimos-500 shadow-sm' :
                                            'bg-slate-50 border border-slate-200 text-slate-400'
                                        }`}>
                                            {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                                        </div>
                                        <span className="hidden sm:inline">{label}</span>
                                    </div>
                                    {i < STEPS.length - 1 && (!isAuthenticated || i !== 1) && (
                                        <div className={`flex-1 h-px ${isCompleted ? 'bg-mimos-500/50' : 'bg-slate-200'}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-50/50 border border-red-100 text-red-600 text-sm flex items-start gap-3">
                            <div className="mt-0.5 text-lg">🚨</div>
                            <div className="flex-1 font-medium">{error}</div>
                        </div>
                    )}

                    {/* Step content */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                        {step === 0 && <DetailsStep form={form} />}
                        {step === 1 && <AccountStep form={form} />}
                        {step === 2 && !isAuthenticated && <AuthGateStep form={form} />}
                        {step === 3 && <ConfirmationStep form={form} />}
                    </div>
                </div>

                {/* Right Column: Sticky Live Summary */}
                {step < 3 && (
                    <div className="w-full lg:w-[380px] shrink-0 sticky top-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 p-5">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Booking Summary</h3>
                                <p className="text-xs text-slate-500">Verify your details before confirming</p>
                            </div>
                            
                            <div className="p-5 space-y-5">
                                {/* Room Details */}
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-1">{roomInfo.roomName || 'Unknown Room'}</h4>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        {roomInfo.location || 'Unknown Location'}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* Date & Time */}
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-mimos-50 text-mimos-600 rounded-lg shrink-0">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                                                {form.endDate && form.endDate !== roomInfo.date ? 'Dates' : 'Date'}
                                            </div>
                                            <div className="text-sm font-medium text-slate-900">
                                                {form.endDate && form.endDate !== roomInfo.date
                                                    ? `${formatDate(roomInfo.date)} — ${formatDate(form.endDate)}`
                                                    : formatDate(roomInfo.date)
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-mimos-50 text-mimos-600 rounded-lg shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Time</div>
                                            <div className="text-sm font-medium text-slate-900">
                                                {formatTime(roomInfo.startTime)} – {formatTime(roomInfo.endTime)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-mimos-50 text-mimos-600 rounded-lg shrink-0">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Capacity limit</div>
                                            <div className="text-sm font-medium text-slate-900">Up to {roomInfo.capacity} pax</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Live Form Data */}
                                {(form.title || form.attendees) && (
                                    <>
                                        <div className="h-px bg-slate-100" />
                                        <div className="space-y-3">
                                            {form.title && (
                                                <div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Purpose</div>
                                                    <div className="text-sm text-slate-700 line-clamp-2">{form.title}</div>
                                                </div>
                                            )}
                                            {form.attendees && (
                                                <div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attendees</div>
                                                    <div className="text-sm text-slate-700">{form.attendees} people</div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Visual Footer */}
                            <div className="h-1.5 bg-gradient-to-r from-mimos-500 to-pink-600" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
