import React from 'react';
import { Pencil, Trash2, Check, X, Ban, Loader2 } from 'lucide-react';

const statusConfig = {
    pending: { text: 'PENDING', className: 'bg-amber-50 text-amber-700 border-amber-500/30' },
    approved: { text: 'CONFIRMED', className: 'bg-emerald-50 text-emerald-700 border-emerald-500/30' },
    rejected: { text: 'REJECTED', className: 'bg-red-50 text-red-700 border-red-500/30' },
    cancelled: { text: 'CANCELLED', className: 'bg-slate-50 text-slate-600 border-slate-400/30' },
};

export default function BookingCard({
    booking,
    isAdmin = false,
    showCheckbox = false,
    isSelected = false,
    onSelect = null,
    onViewDetails = null,
    onApprove = null,
    onReject = null,
    onCancel = null,
    onEdit = null,
    isActionPending = false,
    actioningId = null,
}) {
    // 1. Format date components for left date badge
    const dt = new Date(booking.start_time);
    const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const dayNum = dt.getDate();
    const monthName = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

    // 2. Map status values & styles
    const statusInfo = statusConfig[booking.status] || {
        text: booking.status?.toUpperCase(),
        className: 'bg-slate-50 text-slate-600 border-slate-300'
    };

    // 3. Format start & end times (e.g. 5:00PM - 7:00PM)
    const formatTime = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(/\s+/g, '').toUpperCase();
    };

    const timeRange = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`;

    const isPending = booking.status === 'pending';
    const isApproved = booking.status === 'approved';
    const isLoadingThis = isActionPending && actioningId === booking.id;

    // Retrieve location name or code
    const locationName = booking.room?.location?.name || booking.room?.location?.code || 'LOCATION';

    return (
        <div
            className={`bg-white border rounded-3xl p-5 md:p-6 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full relative ${
                isSelected
                    ? 'border-mimos-500 bg-mimos-500/[0.02] shadow-sm'
                    : 'border-slate-200/90 hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5'
            }`}
        >
            {/* Left Section: Checkbox (if any) + Date badge + Divider + Badges, Title, Time, Room, View More */}
            <div className="flex items-start flex-1 gap-4 min-w-0">
                {/* Admin Select Checkbox */}
                {isAdmin && showCheckbox && (
                    <div className="flex items-center justify-center pr-1 flex-shrink-0 self-center">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={onSelect}
                            className="w-5 h-5 text-mimos-500 rounded border-slate-300 focus:ring-mimos-500 cursor-pointer transition-all duration-150"
                        />
                    </div>
                )}

                {/* Left date column matching the design precisely */}
                <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 text-center select-none pr-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">{weekday}</span>
                    <span className="text-3xl font-extrabold text-blue-600 my-1 tracking-tight leading-none">{dayNum}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">{monthName}</span>
                </div>

                {/* Divider Line */}
                <div className="w-px bg-slate-200/80 self-stretch my-1 flex-shrink-0 hidden md:block" />

                {/* Middle Section: Badges, Title, Time, Room, View More arranged in two columns like the design */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start min-w-0 pl-1 md:pl-2">
                    {/* Column 1: Badges & Title */}
                    <div className="space-y-2.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap select-none">
                            {/* Location badge in soft lavender/slate */}
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-200/40">
                                {locationName}
                            </span>
                            {/* Custom status badge */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border ${statusInfo.className}`}>
                                {statusInfo.text}
                            </span>
                            {isAdmin && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                    #{booking.id}
                                </span>
                            )}
                        </div>
                        
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug tracking-tight truncate max-w-full" title={booking.title}>
                            {booking.title}
                        </h3>

                        {/* Rejection / Cancellation summary for clean quick overview */}
                        {booking.rejection_reason && (
                            <div className="mt-1.5 text-[11px] text-red-650 truncate max-w-md font-medium">
                                <span className="font-semibold">Rejection reason:</span> {booking.rejection_reason}
                            </div>
                        )}
                        {booking.cancellation_reason && (
                            <div className="mt-1.5 text-[11px] text-amber-650 truncate max-w-md font-medium">
                                <span className="font-semibold">Cancellation reason:</span> {booking.cancellation_reason}
                            </div>
                        )}
                    </div>

                    {/* Column 2: Time, Room, View more */}
                    <div className="space-y-1.5 md:pt-0.5">
                        {/* Time duration */}
                        <div className="text-sm font-bold text-slate-800 tracking-tight leading-none">
                            {timeRange}
                        </div>

                        {/* Room name */}
                        <div className="text-xs text-slate-500 font-semibold leading-none">
                            {booking.room?.name || 'Unknown Room'}
                        </div>

                        {/* View more button link */}
                        {onViewDetails && (
                            <div className="pt-1.5">
                                <button
                                    onClick={() => onViewDetails(booking)}
                                    className="text-[13px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition duration-150 bg-transparent border-0 cursor-pointer p-0 hover:underline leading-none"
                                >
                                    View more <span className="text-xs">→</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Section: Card Action Buttons */}
            {((isAdmin && (isPending || isApproved)) || (!isAdmin && (onEdit || onCancel))) && (
                <div className="flex-shrink-0 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0 mt-1 md:mt-0 flex items-center justify-end">
                    <div className="flex flex-row md:flex-col gap-2 w-full sm:w-auto">
                        {isAdmin ? (
                            <>
                                {/* Admin Pending Actions */}
                                {isPending && onApprove && onReject && (
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => onApprove(booking.id)}
                                            disabled={isActionPending}
                                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none min-w-[80px]"
                                        >
                                            {isLoadingThis ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Check className="w-3 h-3" />
                                            )}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => onReject(booking.id)}
                                            disabled={isActionPending}
                                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none min-w-[80px]"
                                        >
                                            <X className="w-3 h-3" />
                                            Reject
                                        </button>
                                    </div>
                                )}
                                
                                {/* Admin Approved Actions */}
                                {isApproved && onCancel && (
                                    <button
                                        onClick={() => onCancel(booking.id)}
                                        disabled={isActionPending}
                                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none min-w-[80px]"
                                    >
                                        <Ban className="w-3 h-3" />
                                        Cancel
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {/* User Pending / Approved Actions */}
                                {isPending && onEdit && (
                                    <button
                                        onClick={() => onEdit(booking)}
                                        disabled={isActionPending}
                                        className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none min-w-[80px]"
                                    >
                                        <Pencil className="w-3 h-3" />
                                        Edit
                                    </button>
                                )}
                                {(isPending || isApproved) && onCancel && (
                                    <button
                                        onClick={() => onCancel(booking.id)}
                                        disabled={isActionPending}
                                        className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none min-w-[80px]"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Cancel
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
