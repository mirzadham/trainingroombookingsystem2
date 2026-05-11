import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, Check } from 'lucide-react';
import useBookingForm from './hooks/useBookingForm';
import DetailsStep from './steps/DetailsStep';
import ReviewStep from './steps/ReviewStep';
import AuthGateStep from './steps/AuthGateStep';
import ConfirmationStep from './steps/ConfirmationStep';

const STEPS = ['Details', 'Review', 'Account', 'Confirm'];

/**
 * BookingWizard — Orchestrator component for the multi-step booking flow.
 * Each step is a separate component. All form state lives in the useBookingForm hook.
 */
export default function BookingWizard() {
    const navigate = useNavigate();
    const form = useBookingForm();
    const { step, setStep, roomInfo, error, isAuthenticated, formatTime, formatDate } = form;

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Back button */}
            <button
                onClick={() => step > 0 && step < 3 ? setStep(s => s - 1) : navigate(-1)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                {step > 0 && step < 3 ? 'Back' : 'Back to search'}
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((label, i) => (
                    <React.Fragment key={label}>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${i <= step ? 'text-mimos-600' : 'text-slate-500'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                i < step ? 'bg-mimos-500 text-white' :
                                i === step ? 'bg-mimos-500/20 text-mimos-600 ring-2 ring-mimos-500/50' :
                                'bg-white border border-slate-200 text-slate-500'
                            }`}>
                                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span className="hidden sm:inline">{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-px ${i < step ? 'bg-mimos-500/50' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Room summary bar */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-slate-900 font-medium">{roomInfo.roomName}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3 h-3" />{roomInfo.location}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Users className="w-3 h-3" />Max {roomInfo.capacity}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" />{formatTime(roomInfo.startTime)} – {formatTime(roomInfo.endTime)}</span>
                <span className="text-xs text-slate-600">{formatDate(roomInfo.startTime)}</span>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Step content */}
            {step === 0 && <DetailsStep form={form} />}
            {step === 1 && <ReviewStep form={form} />}
            {step === 2 && !isAuthenticated && <AuthGateStep form={form} />}
            {step === 3 && <ConfirmationStep form={form} />}
        </div>
    );
}
