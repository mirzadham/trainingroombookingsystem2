import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock, Loader2, TrendingUp, Download } from 'lucide-react';
import { format, subDays } from 'date-fns';
import * as api from '../../services/api';
import DatePicker from '../../components/ui/DatePicker';

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

    // Helper to trigger virtual a-tag download
    const triggerCSVDownload = (filename, headers, rows) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export room utilization metrics
    const downloadUtilizationCSV = () => {
        const headers = ['Room Name', 'Location', 'Utilization %', 'Booked Hours', 'Available Hours'];
        const rows = (utilization?.rooms || []).map(r => [
            `"${r.room.replace(/"/g, '""')}"`,
            `"${r.location.replace(/"/g, '""')}"`,
            r.utilization_pct,
            r.booked_hours,
            r.available_hours
        ]);
        triggerCSVDownload('room_utilization_report', headers, rows);
    };

    // Export peak usage hours metrics
    const downloadPeakHoursCSV = () => {
        const headers = ['Hour Label', 'Hour (24h)', 'Booking Count'];
        const rows = (peakHours || []).map(h => [
            `"${h.label.replace(/"/g, '""')}"`,
            h.hour,
            h.booking_count
        ]);
        triggerCSVDownload('peak_booking_hours_report', headers, rows);
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h1>
                <p className="text-sm text-slate-500 mt-0.5">Comprehensive insight into room utilization, peak slots, and activity metrics</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8 p-5 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-xs rounded-3xl items-end relative z-10">
                <div className="flex-1 min-w-[200px] relative z-30">
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest">Start Date</label>
                    <DatePicker
                        id="start-date"
                        value={startDate}
                        onChange={(val) => setStartDate(val)}
                        min="2000-01-01"
                        className="py-3"
                    />
                </div>
                <div className="flex-1 min-w-[200px] relative z-20">
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest">End Date</label>
                    <DatePicker
                        id="end-date"
                        value={endDate}
                        onChange={(val) => setEndDate(val)}
                        min="2000-01-01"
                        className="py-3"
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest">Location Branch</label>
                    <div className="relative">
                        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/85 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-mimos-500/30 focus:border-mimos-500 hover:border-slate-300 transition-all cursor-pointer appearance-none shadow-inner">
                            <option value="" className="bg-white">All Locations</option>
                            {(locations || []).map(loc => (
                                <option key={loc.id} value={loc.id} className="bg-white">{loc.code} - {loc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-10 h-10 text-mimos-500 animate-spin" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest animate-pulse">Compiling Report Metrics...</p>
                </div>
            )}

            {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Room Utilization */}
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-xs rounded-3xl p-6 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 shadow-xs">
                                    <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Room Utilization</h2>
                            </div>
                            {utilization?.rooms?.length > 0 && (
                                <button
                                    onClick={downloadUtilizationCSV}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-mimos-600 bg-mimos-50 hover:bg-mimos-100 border border-mimos-200/50 rounded-xl transition cursor-pointer font-semibold shadow-xs hover:scale-105 active:scale-95 duration-200"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                </button>
                            )}
                        </div>

                        {utilization?.rooms?.length === 0 && (
                            <div className="text-sm text-slate-400 text-center py-12 font-medium">No utilization records found</div>
                        )}

                        <div className="space-y-6">
                            {(utilization?.rooms || []).map((room) => (
                                <div key={room.room} className="group/item">
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="text-slate-800 font-semibold group-hover/item:text-mimos-600 transition-colors">{room.room}
                                            <span className="text-xs text-slate-400 ml-1.5 font-normal">({room.location})</span>
                                        </span>
                                        <span className="text-slate-900 font-bold">{room.utilization_pct}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/30">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out shadow-xs group-hover/item:shadow-sm"
                                            style={{
                                                width: `${room.utilization_pct}%`,
                                                background: room.utilization_pct > 70
                                                    ? 'linear-gradient(90deg, #f59e0b, #a72190, #ec4899)'
                                                    : room.utilization_pct > 30
                                                        ? 'linear-gradient(90deg, #3b82f6, #6366f1, #a72190)'
                                                        : 'linear-gradient(90deg, #10b981, #06b6d4)',
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold tracking-wider uppercase">
                                        <span>Booked Hours: {room.booked_hours}h</span>
                                        <span>Total Capacity: {room.available_hours}h</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Peak Hours */}
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-xs rounded-3xl p-6 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 shadow-xs">
                                    <Clock className="w-4.5 h-4.5 text-blue-655" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Peak Hours</h2>
                            </div>
                            {peakHours?.length > 0 && (
                                <button
                                    onClick={downloadPeakHoursCSV}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-mimos-600 bg-mimos-50 hover:bg-mimos-100 border border-mimos-200/50 rounded-xl transition cursor-pointer font-semibold shadow-xs hover:scale-105 active:scale-95 duration-200"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                </button>
                            )}
                        </div>

                        {peakHours?.length === 0 && (
                            <div className="text-sm text-slate-400 text-center py-12 font-medium">No peak hours recorded</div>
                        )}

                        <div className="flex items-end gap-2.5 h-64 pt-6 px-2">
                            {(peakHours || []).map((hour) => {
                                const heightPct = maxPeak > 0 ? (hour.booking_count / maxPeak) * 100 : 0;
                                return (
                                    <div key={hour.hour} className="flex-1 flex flex-col items-center justify-end h-full group/bar cursor-pointer">
                                        <div className="relative w-full flex flex-col items-center group-hover/bar:-translate-y-1 transition-transform duration-300">
                                            {/* Tooltip on Hover */}
                                            <span className="absolute -top-7 text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 shadow-sm pointer-events-none whitespace-nowrap">
                                                {hour.booking_count} bookings
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-600 mb-1.5 transition-colors group-hover/bar:text-mimos-600">
                                                {hour.booking_count}
                                            </span>
                                            <div
                                                className="w-full rounded-t-full transition-all duration-700 ease-out origin-bottom group-hover/bar:shadow-md"
                                                style={{
                                                    height: `${Math.max((heightPct / 100) * 160, 6)}px`,
                                                    background: heightPct > 70
                                                        ? 'linear-gradient(to top, #a72190, #ec4899, #f43f5e)'
                                                        : 'linear-gradient(to top, #3b82f6, #6366f1, #a72190)',
                                                }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 mt-2.5 tracking-wider uppercase group-hover/bar:text-slate-600 transition-colors">
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
