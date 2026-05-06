import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, Clock, MapPin, Users, Filter } from 'lucide-react';
import * as api from '../../services/api';

const STATUS_COLORS = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AdminBookings() {
    const [statusFilter, setStatusFilter] = useState('pending');
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['admin-bookings', statusFilter],
        queryFn: () => api.getAdminBookings({ status: statusFilter || undefined }),
    });

    const approveMutation = useMutation({
        mutationFn: (id) => api.approveBooking(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => api.rejectBooking(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
            setRejectingId(null);
            setRejectReason('');
        },
    });

    const bookings = data?.data || [];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manage Bookings</h1>
                    <p className="text-sm text-slate-500 mt-1">Approve, reject, or review booking requests</p>
                </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {['pending', 'approved', 'rejected', 'cancelled', ''].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition cursor-pointer ${
                            statusFilter === status
                                ? 'bg-mimos-50 text-mimos-700 border border-mimos-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {status || 'All'}
                    </button>
                ))}
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-mimos-400 animate-spin" />
                </div>
            )}

            {!isLoading && bookings.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    No bookings found with this filter.
                </div>
            )}

            <div className="space-y-3">
                {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h3 className="text-sm font-semibold text-slate-900">{booking.title}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[booking.status]}`}>
                                        {booking.status}
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-mono">#{booking.id}</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                    <span><strong className="text-slate-600">By:</strong> {booking.user?.name}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.room?.name} · {booking.room?.location?.code}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(booking.start_time).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {' · '}
                                        {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        –
                                        {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.attendees}</span>
                                </div>

                                {booking.rejection_reason && (
                                    <div className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                                        <strong>Rejection reason:</strong> {booking.rejection_reason}
                                    </div>
                                )}

                                {/* Reject form inline */}
                                {rejectingId === booking.id && (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Rejection reason (required)"
                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => rejectMutation.mutate({ id: booking.id, reason: rejectReason })}
                                            disabled={!rejectReason.trim() || rejectMutation.isPending}
                                            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition cursor-pointer"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                            className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Action buttons */}
                            {booking.status === 'pending' && rejectingId !== booking.id && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => approveMutation.mutate(booking.id)}
                                        disabled={approveMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                                    >
                                        <Check className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button
                                        onClick={() => setRejectingId(booking.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
