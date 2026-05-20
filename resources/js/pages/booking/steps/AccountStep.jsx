import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function AccountStep({ form }) {
    const { 
        guestName, setGuestName, 
        guestEmail, setGuestEmail, 
        phone, setPhone, 
        isAuthenticated, 
        canProceedToAuthOrSubmit, 
        handleNext,
        updateProfileOnSubmit, setUpdateProfileOnSubmit
    } = form;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">Your Details</h2>
                <p className="text-sm text-slate-500 mt-1">
                    {isAuthenticated 
                        ? "Review or update your contact details for this booking below." 
                        : "Please provide your contact details for this booking."}
                </p>
            </div>

            {isAuthenticated && (
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-emerald-900">Logged In</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">Your details are pre-filled from your profile. You can edit them if needed.</p>
                    </div>
                </div>
            )}

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

                {isAuthenticated && (
                    <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 rounded-xl cursor-pointer select-none transition group">
                        <input
                            type="checkbox"
                            checked={updateProfileOnSubmit}
                            onChange={e => setUpdateProfileOnSubmit(e.target.checked)}
                            className="w-4 h-4 rounded text-mimos-500 focus:ring-mimos-500 border-slate-300 transition cursor-pointer"
                        />
                        <div className="text-left">
                            <span className="block text-xs font-bold text-slate-700 group-hover:text-slate-900 transition">
                                Save these updates to my profile
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                                Keep your persistent account details synchronized with these updates.
                            </span>
                        </div>
                    </label>
                )}
            </div>

            <Button
                onClick={handleNext}
                disabled={!canProceedToAuthOrSubmit}
                size="lg"
                className="w-full group py-3 text-base"
            >
                {isAuthenticated ? 'Submit Booking' : 'Next Step'}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
    );
}
