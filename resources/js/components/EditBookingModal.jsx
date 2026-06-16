import React, { useState, useEffect, useRef } from 'react';
import { X, Pencil, MapPin, Clock, Users as UsersIcon, AlertCircle, CheckCircle } from 'lucide-react';
import Input from './ui/Input';
import Button from './ui/Button';

export default function EditBookingModal({ booking, onClose, onSave, isSaving }) {
    const [title, setTitle] = useState(booking.title || '');
    const [description, setDescription] = useState(booking.description || '');
    const [attendees, setAttendees] = useState(String(booking.attendees || ''));
    const [phone, setPhone] = useState(booking.phone || '');
    const [error, setError] = useState('');

    const titleRef = useRef(null);
    const backdropRef = useRef(null);

    const roomCapacity = booking.room?.capacity || 9999;
    const att = parseInt(attendees || 0);
    const isOverCapacity = attendees && att > roomCapacity;

    const canSave =
        title.trim() &&
        attendees &&
        att > 0 &&
        !isOverCapacity &&
        phone.trim();

    // Focus title on mount
    useEffect(() => {
        const timer = setTimeout(() => titleRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!canSave) return;

        onSave(
            booking.id,
            {
                title: title.trim(),
                description: description.trim() || null,
                attendees: parseInt(attendees),
                phone: phone.trim(),
            },
            {
                onError: (err) => {
                    const msg =
                        err?.response?.data?.errors
                            ? Object.values(err.response.data.errors).flat().join(' ')
                            : err?.response?.data?.message || 'Failed to update booking.';
                    setError(msg);
                },
            }
        );
    };

    const handleBackdropClick = (e) => {
        if (e.target === backdropRef.current) onClose();
    };

    // Format time for display
    const formatTime = (isoStr) => {
        if (!isoStr) return '';
        return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        return new Date(isoStr).toLocaleDateString('en-MY', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200/50 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-mimos-50 rounded-xl border border-mimos-100">
                            <Pencil className="w-4 h-4 text-mimos-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Edit Booking</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Modify details for booking {booking.reference_no || `#${booking.id}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Room info (read-only context) */}
                <div className="mx-6 mb-5 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Room & Schedule (Read Only)</div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-slate-600">
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-mimos-400" />
                            <span className="font-medium text-slate-800">{booking.room?.name}</span>
                            <span className="text-slate-400">·</span>
                            <span>{booking.room?.location?.code || booking.room?.location?.name}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(booking.start_time)}</span>
                            <span className="text-slate-400">·</span>
                            <span>{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
                        </span>
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mx-6 mb-4 p-3.5 rounded-xl bg-red-50/80 border border-red-100 text-red-600 text-sm flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                    <Input
                        ref={titleRef}
                        label="Title / Purpose *"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. AI Workshop Session 3"
                    />

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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
                            onChange={(e) => setAttendees(e.target.value)}
                            min="1"
                            max={roomCapacity}
                            placeholder={`Max ${roomCapacity}`}
                        />
                        {isOverCapacity && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium">
                                Attendees cannot exceed room capacity ({roomCapacity}).
                            </p>
                        )}
                    </div>

                    <Input
                        label="Phone Number *"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+60 12 345 6789"
                    />

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1 py-3"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSave || isSaving}
                            loading={isSaving}
                            className="flex-1 py-3 group"
                        >
                            {!isSaving && <CheckCircle className="w-4 h-4" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
