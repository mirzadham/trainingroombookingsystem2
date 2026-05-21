import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Clock, MapPin, Users, XCircle, Pencil, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BOOKING_STATUS } from '../constants/bookingStatus';
import Badge from '../components/ui/Badge';
import EditBookingModal from '../components/EditBookingModal';
import * as api from '../services/api';

const FILTER_TAB_ORDER = [
    '',
    BOOKING_STATUS.PENDING,
    BOOKING_STATUS.APPROVED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.CANCELLED,
];

const FILTER_LABELS = {
    '': 'All',
    [BOOKING_STATUS.PENDING]: 'Pending',
    [BOOKING_STATUS.APPROVED]: 'Approved',
    [BOOKING_STATUS.REJECTED]: 'Rejected',
    [BOOKING_STATUS.CANCELLED]: 'Cancelled',
};

const FILTER_DOT_COLOR = {
    '': 'bg-mimos-500',
    [BOOKING_STATUS.PENDING]: 'bg-amber-400',
    [BOOKING_STATUS.APPROVED]: 'bg-emerald-400',
    [BOOKING_STATUS.REJECTED]: 'bg-red-400',
    [BOOKING_STATUS.CANCELLED]: 'bg-slate-400',
};

function BookingCard({ booking, cancelMutation, onEdit }) {
    const statusBorderAccent =
        booking.status === 'approved'  ? 'bg-emerald-400' :
        booking.status === 'pending'   ? 'bg-amber-400'  :
        booking.status === 'rejected'  ? 'bg-red-400'    :
        booking.status === 'cancelled'? 'bg-slate-300'  : 'bg-slate-200';

    return (
        <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${statusBorderAccent}`} />
            <div className="flex items-start justify-between gap-4 p-5 pl-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-900">{booking.title}</h3>
                        <Badge status={booking.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-mimos-400" />
                            <span className="text-slate-700 font-medium">{booking.room?.name}</span>
                            <span className="text-slate-400">·</span>
                            <span>{booking.room?.location?.code}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-700">
                                {new Date(booking.start_time).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-slate-500">
                                {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-slate-400">–</span>
                            <span className="text-slate-700">
                                {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{booking.attendees}</span>
                        </span>
                        {booking.phone && (
                            <span className="flex items-center gap-1.5 text-slate-700">
                                <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-mimos-50">
                                    <svg className="w-2.5 h-2.5 text-mimos-500" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                    </svg>
                                </span>
                                <span className="text-[11px] font-medium">{booking.phone}</span>
                            </span>
                        )}
                    </div>
                    {booking.rejection_reason && (
                        <div className="mt-2.5 text-[13px] text-red-700 bg-red-50/80 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                            <span><strong className="text-red-800">Reason:</strong> {booking.rejection_reason}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0 mt-1">
                    {booking.status === 'pending' && (
                        <button
                            onClick={() => onEdit(booking)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-mimos-600 bg-mimos-50 hover:bg-mimos-100 border border-mimos-100 rounded-lg transition-all cursor-pointer"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                    )}
                    {(booking.status === 'approved' || booking.status === 'pending') && (
                        <button
                            onClick={() => cancelMutation.mutate(booking.id)}
                            disabled={cancelMutation.isPending}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-all cursor-pointer"
                        >
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MyBookings() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeStatus, setActiveStatus] = useState('');
    const [editingBooking, setEditingBooking] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['my-bookings', activeStatus],
        queryFn: () => api.getBookings({ status: activeStatus || undefined }),
        enabled: isAuthenticated,
    });

    const cancelMutation = useMutation({
        mutationFn: (id) => api.cancelBooking(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.updateBooking(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setEditingBooking(null);
        },
    });

    const handleEditSave = (id, data, callbacks) => {
        updateMutation.mutate(
            { id, data },
            {
                onError: callbacks?.onError,
            }
        );
    };

    const bookings = data?.data || [];

    const monthGroups = useMemo(() => {
        const map = new Map();
        bookings.forEach(b => {
            const dt = new Date(b.start_time);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            const label = dt.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
            if (!map.has(key)) map.set(key, { label, bookings: [] });
            map.get(key).bookings.push(b);
        });
        return map;
    }, [bookings]);

    if (!isAuthenticated) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-mimos-500/10 to-pink-600/10 flex items-center justify-center">
                    <CalendarCheck className="w-8 h-8 text-mimos-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign in to view your bookings</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">You need to be logged in to see your booking history.</p>
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-mimos-500 to-pink-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-mimos-500/25 hover:shadow-mimos-500/40 hover:-translate-y-0.5 transition-all cursor-pointer">Go to Home</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Bookings</h1>
                <p className="text-sm text-slate-500 mt-1">Track and manage all your room reservations</p>
            </div>

            <div className="flex gap-2 mb-8 flex-wrap">
                {FILTER_TAB_ORDER.map(status => {
                    const isActive = activeStatus === status;
                    return (
                        <button
                            key={status}
                            onClick={() => setActiveStatus(status)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${
                                isActive
                                    ? 'bg-mimos-50 text-mimos-700 border-mimos-200 shadow-sm'
                                    : 'bg-white/70 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300'
                            }`}
                        >
                            {isActive && <span className={`inline-block w-2 h-2 rounded-full ${FILTER_DOT_COLOR[status]}`} />}
                            {FILTER_LABELS[status]}
                        </button>
                    );
                })}
            </div>

            {isLoading && (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-4 bg-slate-200 rounded w-2/5" />
                                        <div className="h-4 bg-slate-100 rounded w-16" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-3 bg-slate-100 rounded w-24" />
                                        <div className="h-3 bg-slate-100 rounded w-32" />
                                        <div className="h-3 bg-slate-100 rounded w-16" />
                                    </div>
                                </div>
                                <div className="h-8 bg-slate-100 rounded-lg w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && bookings.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-mimos-500/10 to-pink-600/10 flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8 text-mimos-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">No bookings yet</h2>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Find and book a training room to get started.</p>
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-mimos-500 to-pink-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-mimos-500/25 hover:shadow-mimos-500/40 hover:-translate-y-0.5 transition-all cursor-pointer">Browse Rooms</button>
                </div>
            )}

            {!isLoading && bookings.length > 0 && (
                <div className="space-y-8">
                    {[...monthGroups.entries()].map(([key, { label, bookings: groupBookings }]) => (
                        <div key={key}>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] mb-4 mt-8 first:mt-0 flex items-center gap-3">
                                <span className="flex-1 h-px bg-slate-200" />
                                <span>{label}</span>
                                <span className="flex-1 h-px bg-slate-200" />
                            </div>
                            <div className="space-y-4">
                                {groupBookings.map(b => (
                                    <BookingCard key={b.id} booking={b} cancelMutation={cancelMutation} onEdit={setEditingBooking} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Booking Modal */}
            {editingBooking && (
                <EditBookingModal
                    booking={editingBooking}
                    onClose={() => { setEditingBooking(null); updateMutation.reset(); }}
                    onSave={handleEditSave}
                    isSaving={updateMutation.isPending}
                />
            )}
        </div>
    );
}
