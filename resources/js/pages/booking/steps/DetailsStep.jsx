import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function DetailsStep({ form }) {
    const { title, setTitle, description, setDescription, attendees, setAttendees, roomInfo, canProceedToAccount, handleNext } = form;
    const titleRef = useRef(null);

    // Auto-focus Title input on mount
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.focus();
        }
    }, []);

    const cap = parseInt(roomInfo.capacity || 9999);
    const att = parseInt(attendees || 0);
    const isOverCapacity = attendees && att > cap;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">Booking Details</h2>
                <p className="text-sm text-slate-500 mt-1">What is the purpose of this booking?</p>
            </div>

            <div className="space-y-5">
                <Input
                    ref={titleRef}
                    label="Title / Purpose *"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. AI Workshop Session 3"
                />

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Optional — describe the purpose, required equipment, etc."
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition resize-none"
                    />
                </div>

                <div>
                    <Input
                        label="Number of Attendees *"
                        type="number"
                        value={attendees}
                        onChange={e => setAttendees(e.target.value)}
                        min="1"
                        max={roomInfo.capacity}
                        placeholder={`Max ${roomInfo.capacity}`}
                    />
                    {isOverCapacity && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium">Attendees cannot exceed room capacity ({roomInfo.capacity}).</p>
                    )}
                </div>
            </div>

            <Button
                onClick={handleNext}
                disabled={!canProceedToAccount || isOverCapacity}
                size="lg"
                className="w-full group py-3 text-base"
            >
                Next Step
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
    );
}
