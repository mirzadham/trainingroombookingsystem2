import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock, Loader2, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import * as api from '../../services/api';

export default function Reports() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [locationFilter, setLocationFilter] = useState('');

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
    });

    const { data: utilization, isLoading: utilLoading } = useQuery({
        queryKey: ['report-utilization', startDate, endDate, locationFilter],
        queryFn: () => api.getUtilizationReport({
            start_date: startDate,
            end_date: endDate,
            location_id: locationFilter || undefined,
        }),
        enabled: !!(startDate && endDate),
    });

    const { data: peakHours, isLoading: peakLoading } = useQuery({
        queryKey: ['report-peak-hours', startDate, endDate, locationFilter],
        queryFn: () => api.getPeakHoursReport({
            start_date: startDate,
            end_date: endDate,
            location_id: locationFilter || undefined,
        }),
        enabled: !!(startDate && endDate),
    });

    const isLoading = utilLoading || peakLoading;
    const maxPeak = peakHours ? Math.max(...peakHours.map(h => h.booking_count), 1) : 1;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
                <p className="text-sm text-slate-500 mt-1">Room utilization and booking trends</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white border border-slate-200 shadow-sm rounded-2xl">
                <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Location</label>
                    <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer">
                        <option value="" className="bg-white">All</option>
                        {(locations || []).map(loc => (
                            <option key={loc.id} value={loc.id} className="bg-white">{loc.code}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
            )}

            {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Room Utilization */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-slate-900">Room Utilization</h2>
                        </div>

                        {utilization?.rooms?.length === 0 && (
                            <div className="text-sm text-slate-500 text-center py-8">No data for this period</div>
                        )}

                        <div className="space-y-4">
                            {(utilization?.rooms || []).map((room) => (
                                <div key={room.room}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-700 font-medium">{room.room}
                                            <span className="text-xs text-slate-500 ml-1 font-normal">({room.location})</span>
                                        </span>
                                        <span className="text-slate-900 font-medium">{room.utilization_pct}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${room.utilization_pct}%`,
                                                background: room.utilization_pct > 70
                                                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                                    : room.utilization_pct > 30
                                                        ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                                                        : 'linear-gradient(90deg, #10b981, #14b8a6)',
                                            }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-0.5">
                                        {room.booked_hours}h / {room.available_hours}h
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Peak Hours */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-slate-900">Peak Hours</h2>
                        </div>

                        <div className="flex items-end gap-1.5 h-48">
                            {(peakHours || []).map((hour) => {
                                const heightPct = maxPeak > 0 ? (hour.booking_count / maxPeak) * 100 : 0;
                                return (
                                    <div key={hour.hour} className="flex-1 flex flex-col items-center justify-end h-full">
                                        <span className="text-[10px] text-slate-500 mb-1">{hour.booking_count}</span>
                                        <div
                                            className="w-full rounded-t-md transition-all duration-500"
                                            style={{
                                                height: `${Math.max(heightPct, 2)}%`,
                                                background: heightPct > 70
                                                    ? 'linear-gradient(to top, #f59e0b, #ef4444)'
                                                    : 'linear-gradient(to top, #3b82f6, #8b5cf6)',
                                            }}
                                        />
                                        <span className="text-[9px] text-slate-600 mt-1 whitespace-nowrap">
                                            {hour.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
