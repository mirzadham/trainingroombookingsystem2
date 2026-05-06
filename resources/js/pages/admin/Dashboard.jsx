import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Clock, DoorOpen, TrendingUp, MapPin, Users } from 'lucide-react';
import * as api from '../../services/api';

const STAT_CARDS = [
    { key: 'pending_count', label: 'Pending Approvals', icon: CalendarCheck, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
    { key: 'today_bookings', label: "Today's Bookings", icon: Clock, color: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-500/20' },
    { key: 'total_rooms', label: 'Active Rooms', icon: DoorOpen, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { key: 'this_month_bookings', label: 'This Month', icon: TrendingUp, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
];

const STATUS_COLORS = {
    pending: 'text-amber-400',
    approved: 'text-emerald-400',
    rejected: 'text-red-400',
    cancelled: 'text-slate-400',
};

export default function Dashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: api.getAdminDashboard,
    });

    const stats = data?.stats || {};
    const recentBookings = data?.recent_bookings || [];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Overview of your booking system</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {STAT_CARDS.map((card) => (
                    <div
                        key={card.key}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors duration-300"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-slate-400">{card.label}</span>
                            <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color} shadow-lg ${card.shadow}`}>
                                <card.icon className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {isLoading ? '...' : (stats[card.key] ?? 0)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Recent Bookings</h2>

                {recentBookings.length === 0 && !isLoading && (
                    <div className="text-sm text-slate-500 text-center py-12">
                        No bookings yet.
                    </div>
                )}

                <div className="space-y-3">
                    {recentBookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                            <div>
                                <div className="text-sm font-medium text-white">{b.title}</div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span>{b.user?.name}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.room?.name}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(b.start_time).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <span className={`text-[10px] uppercase font-bold ${STATUS_COLORS[b.status]}`}>
                                {b.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
