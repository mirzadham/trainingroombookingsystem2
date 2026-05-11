import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';

export default function ConfirmationStep({ form }) {
    const navigate = useNavigate();
    const { bookingResult } = form;

    if (!bookingResult) return null;

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 mb-4">
                <CalendarCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Submitted!</h2>
            <p className="text-sm text-slate-500 mb-6">
                Your booking is <span className="text-amber-500 font-medium">pending approval</span>. You'll be notified once an admin reviews it.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Booking ID</span><span className="text-slate-900 font-mono">#{bookingResult.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Room</span><span className="text-slate-900">{bookingResult.room?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Contact Phone</span><span className="text-slate-900">{bookingResult.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-amber-500 font-medium uppercase text-xs">{bookingResult.status}</span></div>
            </div>

            <div className="flex gap-3">
                <Button
                    variant="secondary"
                    onClick={() => navigate('/my-bookings')}
                    className="flex-1"
                >
                    My Bookings
                </Button>
                <Button
                    onClick={() => navigate('/')}
                    className="flex-1"
                >
                    Book Another
                </Button>
            </div>
        </div>
    );
}
