import React from 'react';
import { ArrowRight } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function DetailsStep({ form }) {
    const { title, setTitle, description, setDescription, attendees, setAttendees, phone, setPhone, roomInfo, canProceedToReview, handleNext } = form;

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Booking Details</h2>

            <Input
                label="Title / Purpose *"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. AI Workshop Session 3"
            />

            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Description</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Optional — describe the purpose, required equipment, etc."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition resize-none"
                />
            </div>

            <Input
                label="Number of Attendees *"
                type="number"
                value={attendees}
                onChange={e => setAttendees(e.target.value)}
                min="1"
                max={roomInfo.capacity}
                placeholder={`Max ${roomInfo.capacity}`}
            />

            <Input
                label="Phone Number *"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+60 12 345 6789"
                autoComplete="tel"
            />

            <Button
                onClick={handleNext}
                disabled={!canProceedToReview}
                size="lg"
                className="w-full group"
            >
                Review Booking
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
    );
}
