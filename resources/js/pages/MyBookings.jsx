import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Clock, MapPin, Users, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';

const STATUS_COLORS = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function MyBookings() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: () => api.getBookings(),
        enabled: isAuthenticated,
    });

    const cancelMutation = useMutation({
        mutationFn: (id) => api.cancelBooking(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
    });

    if (!isAuthenticated) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Sign in to view your bookings</h2>
                <p className="text-sm text-slate-500 mb-6">You need to be logged in to see your booking history.</p>
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-mimos-500 to-pink-600 text-white font-semibold rounded-xl cursor-pointer">
                    Go to Home
                </button>
            </div>
        );
    }

    const bookings = data?.data || [];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">My Bookings</h1>

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-mimos-400 animate-spin" />
                </div>
            )}

            {!isLoading && bookings.length === 0 && (
                <div className="text-center py-20">
                    <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">No bookings yet</h2>
                    <p className="text-sm text-slate-500 mb-6">Find and book a training room to get started.</p>
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-mimos-500 to-pink-600 text-white font-semibold rounded-xl cursor-pointer">
                        Book a Room
                    </button>
                </div>
            )}

            <div className="space-y-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-base font-semibold text-slate-900">{booking.title}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[booking.status]}`}>
                                        {booking.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.room?.name} ({booking.room?.location?.code})</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(booking.start_time).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                                        {' · '}
                                        {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {' – '}
                                        {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.attendees}</span>
                                </div>
                                {booking.rejection_reason && (
                                    <div className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                                        <strong>Reason:</strong> {booking.rejection_reason}
                                    </div>
                                )}
                            </div>

                            {booking.status === 'approved' && (
                                <button
                                    onClick={() => cancelMutation.mutate(booking.id)}
                                    disabled={cancelMutation.isPending}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                                >
                                    <XCircle className="w-3.5 h-3.5" /> Cancel
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
