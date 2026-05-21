import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BOOKING_STATUS } from '../constants/bookingStatus';
import EditBookingModal from '../components/EditBookingModal';
import BookingCard from '../components/BookingCard';
import BookingDetailsModal from '../components/BookingDetailsModal';
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

export default function MyBookings() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeStatus, setActiveStatus] = useState('');
    const [editingBooking, setEditingBooking] = useState(null);
    const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

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
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] mb-6 mt-8 first:mt-0 flex items-center gap-4 select-none">
                                <span>{label.toUpperCase()}</span>
                                <span className="flex-1 h-px bg-slate-200/80" />
                            </div>
                            <div className="space-y-4">
                                {groupBookings.map(b => (
                                    <BookingCard
                                        key={b.id}
                                        booking={b}
                                        onViewDetails={setSelectedBookingDetails}
                                        onCancel={(id) => cancelMutation.mutate(id)}
                                        onEdit={setEditingBooking}
                                        isActionPending={cancelMutation.isPending}
                                        actioningId={cancelMutation.variables}
                                    />
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

            {/* Booking Details Modal */}
            {selectedBookingDetails && (
                <BookingDetailsModal
                    booking={selectedBookingDetails}
                    onClose={() => setSelectedBookingDetails(null)}
                    onCancel={(id) => cancelMutation.mutate(id)}
                    onEdit={setEditingBooking}
                    isActionPending={cancelMutation.isPending}
                />
            )}
        </div>
    );
}
