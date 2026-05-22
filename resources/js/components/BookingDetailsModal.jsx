import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Users, Phone, AlignLeft, User, Mail, Check, AlertTriangle, FileText, Ban, Pencil, Trash2 } from 'lucide-react';

const statusConfig = {
    pending: { text: 'PENDING', className: 'bg-amber-50 text-amber-700 border-amber-500/30' },
    approved: { text: 'CONFIRMED', className: 'bg-emerald-50 text-emerald-700 border-emerald-500/30' },
    rejected: { text: 'REJECTED', className: 'bg-red-50 text-red-700 border-red-500/30' },
    cancelled: { text: 'CANCELLED', className: 'bg-slate-50 text-slate-600 border-slate-400/30' },
    mixed: { text: 'MIXED STATUS', className: 'bg-indigo-50 text-indigo-700 border-indigo-500/30' },
};

export default function BookingDetailsModal({
    booking,
    onClose,
    isAdmin = false,
    onApprove = null,
    onReject = null,
    onCancel = null,
    onEdit = null,
    isActionPending = false,
}) {
    const [actionState, setActionState] = useState('none'); // 'none' | 'rejecting' | 'cancelling' | 'cancelling_user'
    const [reasonText, setReasonText] = useState('');
    const [error, setError] = useState('');

    const backdropRef = useRef(null);
    const textInputRef = useRef(null);

    // Focus text input when rejecting/cancelling is opened
    useEffect(() => {
        if (actionState !== 'none') {
            setTimeout(() => textInputRef.current?.focus(), 100);
        }
    }, [actionState]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && actionState === 'none') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, actionState]);

    const handleBackdropClick = (e) => {
        if (e.target === backdropRef.current && actionState === 'none') onClose();
    };

    // Date formatting utilities
    const formatDateLong = (isoStr) => {
        if (!isoStr) return '';
        return new Date(isoStr).toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime12 = (isoStr) => {
        if (!isoStr) return '';
        return new Date(isoStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleConfirmAction = async (e) => {
        e.preventDefault();
        setError('');

        if (actionState === 'rejecting') {
            if (!reasonText.trim()) {
                setError('Rejection reason is required.');
                return;
            }
            try {
                await onReject(booking.id, reasonText.trim());
                onClose();
            } catch (err) {
                setError('Failed to reject booking.');
            }
        } else if (actionState === 'cancelling') {
            if (!reasonText.trim()) {
                setError('Cancellation remarks are required.');
                return;
            }
            try {
                await onCancel(booking.id, reasonText.trim());
                onClose();
            } catch (err) {
                setError('Failed to cancel booking.');
            }
        } else if (actionState === 'cancelling_user') {
            try {
                await onCancel(booking.id);
                onClose();
            } catch (err) {
                setError('Failed to cancel booking.');
            }
        }
    };

    const statusInfo = statusConfig[booking.status] || {
        text: booking.status?.toUpperCase(),
        className: 'bg-slate-50 text-slate-600 border-slate-300',
    };

    const isPending = booking.status === 'pending';
    const isApproved = booking.status === 'approved';

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200/50 overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${statusInfo.className} bg-white`}>
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {booking.isGroup ? 'Series Details' : 'Booking Details'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {booking.isGroup ? (
                                    booking.isRecurring ? 'Weekly Series Booking' : 'Consecutive Multi-Day Booking'
                                ) : (
                                    `Reference Reservation #${booking.id}`
                                )}
                            </p>
                        </div>
                    </div>
                    {actionState === 'none' && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer border-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Error Banner */}
                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-150 text-red-650 text-xs font-semibold flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {actionState === 'none' ? (
                        <>
                            {/* Title & Status Block */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border ${statusInfo.className}`}>
                                        {statusInfo.text}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-200/40">
                                        {booking.room?.location?.name || booking.room?.location?.code || 'LOCATION'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                                    {booking.title}
                                </h3>
                            </div>

                            {/* Schedule & Location Card */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-3.5">
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-4.5 h-4.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            {booking.isGroup ? 'Date Range' : 'Date'}
                                        </div>
                                        <div className="text-sm font-semibold text-slate-800 mt-0.5">
                                            {booking.isGroup ? (
                                                `${formatDateLong(booking.group_start_date)} – ${formatDateLong(booking.group_end_date)}`
                                            ) : (
                                                formatDateLong(booking.start_time)
                                            )}
                                        </div>
                                        {booking.isGroup && (
                                            <div className="text-xs font-semibold text-blue-600 mt-1">
                                                Spans {booking.occurrences.length} scheduled days
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Clock className="w-4.5 h-4.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Time Duration</div>
                                        <div className="text-sm font-semibold text-slate-800 mt-0.5">
                                            {formatTime12(booking.start_time)} – {formatTime12(booking.end_time)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4.5 h-4.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Room & Location Details</div>
                                        <div className="text-sm font-semibold text-slate-800 mt-0.5">
                                            {booking.room?.name || 'Unknown Room'}
                                        </div>
                                        {booking.room?.location?.address && (
                                            <div className="text-xs text-slate-550 mt-1">
                                                {booking.room.location.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grid details (Attendees & Contact) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
                                    <Users className="w-4.5 h-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendees</div>
                                        <div className="text-sm font-semibold text-slate-850 mt-0.5">{booking.attendees} Seats</div>
                                    </div>
                                </div>

                                <div className="border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
                                    <Phone className="w-4.5 h-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</div>
                                        <div className="text-sm font-semibold text-slate-850 mt-0.5">{booking.phone || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Requester Profile Information (for admins) */}
                            {isAdmin && booking.user && (
                                <div className="border border-slate-100 rounded-2xl p-4">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Requested By</div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{booking.user.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5" /> {booking.user.email}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="border border-slate-100 rounded-2xl p-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <AlignLeft className="w-3.5 h-3.5" /> Purpose Description
                                </div>
                                <div className="text-sm text-slate-655 leading-relaxed font-medium">
                                    {booking.description || 'No description was provided for this reservation.'}
                                </div>
                            </div>

                            {/* Series Schedule Breakdown */}
                            {booking.isGroup && (
                                <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 select-none">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Series Schedule Details
                                    </div>
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {booking.occurrences.map((occ) => {
                                            const occDt = new Date(occ.start_time);
                                            const formattedDate = occDt.toLocaleDateString('en-MY', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            });
                                            
                                            const occTimeRange = `${formatTime12(occ.start_time)} - ${formatTime12(occ.end_time)}`;
                                            const occStatusInfo = statusConfig[occ.status] || {
                                                text: occ.status?.toUpperCase(),
                                                className: 'bg-slate-50 text-slate-600 border-slate-300'
                                            };

                                            return (
                                                <div 
                                                    key={occ.id} 
                                                    className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex flex-col gap-1.5 hover:bg-slate-50 transition"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="text-xs font-bold text-slate-800">
                                                            {formattedDate}
                                                        </div>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] uppercase font-black tracking-wider border ${occStatusInfo.className} select-none`}>
                                                            {occStatusInfo.text}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        {occTimeRange}
                                                    </div>
                                                    {occ.rejection_reason && (
                                                        <div className="text-[10px] text-red-650 font-medium border-t border-red-100/50 pt-1 mt-1">
                                                            <span className="font-semibold">Rejection reason:</span> {occ.rejection_reason}
                                                        </div>
                                                    )}
                                                    {occ.cancellation_reason && (
                                                        <div className="text-[10px] text-amber-650 font-medium border-t border-amber-100/50 pt-1 mt-1">
                                                            <span className="font-semibold">Cancellation reason:</span> {occ.cancellation_reason}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Rejection / Cancellation details */}
                            {booking.rejection_reason && (
                                <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-xs">
                                    <div className="font-bold text-red-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Rejection Remarks
                                    </div>
                                    <div className="text-slate-650 font-medium leading-relaxed">
                                        {booking.rejection_reason}
                                    </div>
                                </div>
                            )}

                            {booking.cancellation_reason && (
                                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-250/60 text-xs">
                                    <div className="font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <Ban className="w-3.5 h-3.5 text-amber-500" /> Cancellation Remarks
                                    </div>
                                    <div className="text-slate-650 font-medium leading-relaxed">
                                        {booking.cancellation_reason}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Reject Reason / Cancellation Remarks Form */
                        <form onSubmit={handleConfirmAction} className="space-y-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-850 mb-2">
                                    {actionState === 'rejecting'
                                        ? 'Provide Rejection Reason'
                                        : actionState === 'cancelling'
                                        ? 'Provide Cancellation Remarks'
                                        : 'Confirm Cancellation'}
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    {actionState === 'rejecting'
                                        ? 'Explain to the user why their reservation request is being rejected. This will be sent as notification.'
                                        : actionState === 'cancelling'
                                        ? 'Explain why this approved reservation is being cancelled by management.'
                                        : 'Are you sure you want to cancel this booking? This action is permanent.'}
                                </p>

                                {actionState !== 'cancelling_user' && (
                                    <textarea
                                        ref={textInputRef}
                                        value={reasonText}
                                        onChange={(e) => setReasonText(e.target.value)}
                                        placeholder={
                                            actionState === 'rejecting'
                                                ? 'e.g. The room is booked for corporate event maintenance.'
                                                : 'e.g. Request received from user to cancel schedule.'
                                        }
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 transition resize-none font-medium"
                                        required
                                    />
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setActionState('none'); setReasonText(''); setError(''); }}
                                    className="flex-1 py-3 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer"
                                >
                                    Go Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isActionPending}
                                    className={`flex-1 py-3 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ${
                                        actionState === 'rejecting'
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-amber-600 hover:bg-amber-700'
                                    }`}
                                >
                                    {isActionPending ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : actionState === 'rejecting' ? (
                                        <X className="w-4 h-4" />
                                    ) : (
                                        <Ban className="w-4 h-4" />
                                    )}
                                    {actionState === 'rejecting'
                                        ? 'Reject Booking'
                                        : 'Cancel Booking'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Controls (when form is not open) */}
                {actionState === 'none' && (
                    <div className="flex flex-wrap gap-2.5 p-6 border-t border-slate-100 bg-slate-50/50">
                        {/* Single-occurrence action buttons */}
                        {!booking.isGroup && (
                            isAdmin ? (
                                <>
                                    {isPending && onApprove && onReject && (
                                        <div className="flex gap-2.5 w-full">
                                            <button
                                                onClick={() => onApprove(booking.id)}
                                                disabled={isActionPending}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250/70 rounded-xl cursor-pointer transition disabled:opacity-50 select-none"
                                            >
                                                <Check className="w-4 h-4" /> Approve
                                            </button>
                                            <button
                                                onClick={() => setActionState('rejecting')}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold uppercase tracking-wider text-red-700 bg-red-50 hover:bg-red-100 border border-red-250/70 rounded-xl cursor-pointer transition select-none"
                                            >
                                                <X className="w-4 h-4" /> Reject
                                            </button>
                                        </div>
                                    )}

                                    {isApproved && onCancel && (
                                        <button
                                            onClick={() => setActionState('cancelling')}
                                            className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-bold uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-250/70 rounded-xl cursor-pointer transition select-none"
                                        >
                                            <Ban className="w-4 h-4" /> Cancel Booking (Admin)
                                        </button>
                                    )}
                                </>
                            ) : (
                                /* User Action Buttons */
                                <>
                                    {isPending && onEdit && (
                                        <button
                                            onClick={() => { onEdit(booking); onClose(); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-250/70 rounded-xl cursor-pointer transition select-none"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit Details
                                        </button>
                                    )}

                                    {(isPending || isApproved) && onCancel && (
                                        <button
                                            onClick={() => setActionState('cancelling_user')}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold uppercase tracking-wider text-red-700 bg-red-50 hover:bg-red-100 border border-red-250/70 rounded-xl cursor-pointer transition select-none"
                                        >
                                            <Trash2 className="w-4 h-4" /> Cancel Booking
                                        </button>
                                    )}
                                </>
                            )
                        )}

                        {/* Standard Close button */}
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl cursor-pointer transition text-center select-none"
                        >
                            Close Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
