import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, Clock, MapPin, Users, Filter, CheckSquare, Square } from 'lucide-react';
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
    
    // Batch operations state
    const [selectedIds, setSelectedIds] = useState([]);
    const [batchReason, setBatchReason] = useState('');
    const [showBatchReject, setShowBatchReject] = useState(false);
    
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['admin-bookings', statusFilter],
        queryFn: () => api.getAdminBookings({ status: statusFilter || undefined }),
    });

    const approveMutation = useMutation({
        mutationFn: (id) => api.approveBooking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
            setSelectedIds((prev) => prev.filter(x => x !== id));
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => api.rejectBooking(id, reason),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
            setRejectingId(null);
            setRejectReason('');
            setSelectedIds((prev) => prev.filter(x => x !== variables.id));
        },
    });

    // Batch mutations
    const batchApproveMutation = useMutation({
        mutationFn: (ids) => api.batchApproveBookings(ids),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
            setSelectedIds([]);
            alert(`Batch Approval completed successfully!\nSucceeded: ${res.results.success.length}\nFailed: ${res.results.failed.length}`);
        },
    });

    const batchRejectMutation = useMutation({
        mutationFn: ({ ids, reason }) => api.batchRejectBookings(ids, reason),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
            setSelectedIds([]);
            setBatchReason('');
            setShowBatchReject(false);
            alert(`Batch Rejection completed successfully!\nSucceeded: ${res.results.success.length}\nFailed: ${res.results.failed.length}`);
        },
    });

    const bookings = data?.data || [];
    const isPendingTab = statusFilter === 'pending';

    const handleSelectAll = () => {
        if (selectedIds.length === bookings.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(bookings.map(b => b.id));
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manage Bookings</h1>
                    <p className="text-sm text-slate-500 mt-1">Approve, reject, or review booking requests</p>
                </div>
                {isPendingTab && bookings.length > 0 && (
                    <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer self-start sm:self-auto"
                    >
                        {selectedIds.length === bookings.length ? <CheckSquare className="w-4 h-4 text-mimos-500" /> : <Square className="w-4 h-4" />}
                        {selectedIds.length === bookings.length ? 'Deselect All' : 'Select All Pending'}
                    </button>
                )}
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {['pending', 'approved', 'rejected', 'cancelled', ''].map(status => (
                    <button
                        key={status}
                        onClick={() => {
                            setStatusFilter(status);
                            setSelectedIds([]);
                            setShowBatchReject(false);
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition cursor-pointer ${
                            statusFilter === status
                                ? 'bg-mimos-50 text-mimos-700 border border-mimos-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
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
                    <div
                        key={booking.id}
                        className={`bg-white border shadow-sm rounded-2xl p-5 transition flex gap-4 ${
                            selectedIds.includes(booking.id) ? 'border-mimos-500 bg-mimos-500/5' : 'border-slate-200 hover:bg-slate-50/50'
                        }`}
                    >
                        {isPendingTab && (
                            <div className="flex items-center justify-center flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(booking.id)}
                                    onChange={() => handleSelectOne(booking.id)}
                                    className="w-5 h-5 text-mimos-500 rounded border-slate-300 focus:ring-mimos-500 cursor-pointer"
                                />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h3 className="text-sm font-semibold text-slate-900">{booking.title}</h3>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[booking.status]}`}>
                                            {booking.status}
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-mono">#{booking.id}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
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
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.attendees} seats</span>
                                        {booking.phone && <span className="flex items-center gap-1 text-slate-700 font-medium">📞 {booking.phone}</span>}
                                    </div>

                                    {booking.rejection_reason && (
                                        <div className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-150">
                                            <strong>Rejection reason:</strong> {booking.rejection_reason}
                                        </div>
                                    )}

                                    {/* Inline Rejection Form */}
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

                                {/* Individual Action buttons */}
                                {booking.status === 'pending' && rejectingId !== booking.id && (
                                    <div className="flex gap-2 flex-shrink-0 self-center">
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
                    </div>
                ))}
            </div>

            {/* Sticky Floating Batch Drawer */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 flex-wrap justify-between min-w-[320px] max-w-[90%] md:w-auto">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected</span>
                        <span className="bg-gradient-to-r from-mimos-500 to-pink-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-md">
                            {selectedIds.length}
                        </span>
                    </div>

                    {showBatchReject ? (
                        <div className="flex gap-2 items-center flex-1 min-w-[280px]">
                            <input
                                type="text"
                                value={batchReason}
                                onChange={e => setBatchReason(e.target.value)}
                                placeholder="Enter batch rejection reason (required)"
                                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                autoFocus
                            />
                            <button
                                onClick={() => batchRejectMutation.mutate({ ids: selectedIds, reason: batchReason })}
                                disabled={!batchReason.trim() || batchRejectMutation.isPending}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition cursor-pointer"
                            >
                                {batchRejectMutation.isPending ? 'Confirming...' : 'Confirm'}
                            </button>
                            <button
                                onClick={() => { setShowBatchReject(false); setBatchReason(''); }}
                                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs border border-slate-700 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => batchApproveMutation.mutate(selectedIds)}
                                disabled={batchApproveMutation.isPending}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                {batchApproveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Approve Selected
                            </button>
                            <button
                                onClick={() => setShowBatchReject(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                                Reject Selected
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer border border-slate-700"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
