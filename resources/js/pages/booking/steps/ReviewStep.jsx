import React from 'react';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function ReviewStep({ form }) {
    const { roomInfo, title, description, attendees, phone, submitting, isAuthenticated, handleNext, setStep, formatTime, formatDate } = form;

    const rows = [
        { label: 'Title', value: title },
        description && { label: 'Description', value: description },
        { label: 'Room', value: `${roomInfo.roomName} (${roomInfo.location})` },
        { label: 'Date', value: formatDate(roomInfo.startTime) },
        { label: 'Time', value: `${formatTime(roomInfo.startTime)} – ${formatTime(roomInfo.endTime)}` },
        { label: 'Attendees', value: attendees },
        { label: 'Contact Phone', value: phone },
    ].filter(Boolean);

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Review Your Booking</h2>

            <div className="space-y-3 text-sm">
                {rows.map((row) => (
                    <div key={row.label} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">{row.label}</span>
                        <span className="text-slate-900 font-medium text-right max-w-[60%]">{row.value}</span>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
                <Button
                    variant="secondary"
                    onClick={() => setStep(0)}
                    className="flex-1"
                >
                    Edit
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={submitting}
                    loading={submitting}
                    className="flex-1"
                >
                    {isAuthenticated ? (
                        <>Submit Booking <CalendarCheck className="w-4 h-4" /></>
                    ) : (
                        <>Continue <ArrowRight className="w-4 h-4" /></>
                    )}
                </Button>
            </div>
        </div>
    );
}
