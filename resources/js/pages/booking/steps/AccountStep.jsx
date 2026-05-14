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
        handleNext 
    } = form;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">Your Details</h2>
                <p className="text-sm text-slate-500 mt-1">
                    {isAuthenticated 
                        ? "We've pre-filled your information. You can proceed directly." 
                        : "Please provide your contact details for this booking."}
                </p>
            </div>

            {isAuthenticated && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-emerald-900">Logged In</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">Your details are automatically pulled from your account.</p>
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
                    disabled={isAuthenticated}
                    className={isAuthenticated ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
                />

                <Input
                    label="Email Address *"
                    type="email"
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    placeholder="john@example.com"
                    disabled={isAuthenticated}
                    className={isAuthenticated ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
                />

                <Input
                    label="Phone Number *"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+60 12 345 6789"
                />
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
