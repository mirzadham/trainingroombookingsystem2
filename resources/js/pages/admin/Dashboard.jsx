import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Clock, DoorOpen, TrendingUp, MapPin } from 'lucide-react';
import * as api from '../../services/api';
import Badge from '../../components/ui/Badge';

const STAT_CARDS = [
    { key: 'pending_count', label: 'Pending Approvals', icon: CalendarCheck, color: 'bg-amber-600', shadow: 'shadow-amber-500/20' },
    { key: 'today_bookings', label: "Today's Bookings", icon: Clock, color: 'bg-blue-600', shadow: 'shadow-blue-500/20' },
    { key: 'total_rooms', label: 'Active Rooms', icon: DoorOpen, color: 'bg-emerald-600', shadow: 'shadow-emerald-500/20' },
    { key: 'this_month_bookings', label: 'This Month', icon: TrendingUp, color: 'bg-violet-600', shadow: 'shadow-violet-500/20' },
];

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
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-sm text-slate-500 mt-0.5">Real-time status updates and core metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {STAT_CARDS.map((card) => (
                    <div
                        key={card.key}
                        className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:border-mimos-500/30 hover:-translate-y-0.5 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
                    >
                        {/* Soft ambient light card background */}
                        <div className={`absolute -right-4 -bottom-4 w-28 h-28 ${card.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full blur-xl transition-all duration-500`} />
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                             <div className={`p-2.5 rounded-2xl ${card.color} shadow-lg ${card.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                <card.icon className="w-4.5 h-4.5 text-white" />
                            </div>
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight relative z-10">
                            {isLoading ? (
                                <span className="text-slate-300 animate-pulse">...</span>
                            ) : (
                                <span className="text-slate-900">
                                    {stats[card.key] ?? 0}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Recent Bookings</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Lately submitted reservation activities</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                        Latest
                    </span>
                </div>

                {recentBookings.length === 0 && !isLoading && (
                    <div className="text-sm text-slate-400 text-center py-12 font-medium">
                        No bookings yet.
                    </div>
                )}

                <div className="space-y-3">
                    {recentBookings.map((b) => (
                        <div 
                            key={b.id} 
                            className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-200 hover:scale-[1.01] hover:border-slate-200/50"
                        >
                            <div>
                                <div className="text-sm font-bold text-slate-855">{b.title}</div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5 font-medium">
                                    <span className="text-mimos-700 bg-mimos-50 px-2 py-0.5 rounded-md font-semibold">{b.user?.name}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400 animate-pulse" />{b.room?.name}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        {new Date(b.start_time).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                            <Badge status={b.status} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
