import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MapPin, Clock, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import * as api from '../services/api';

export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [locationFilter, setLocationFilter] = useState('');

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data: events, isLoading } = useQuery({
        queryKey: ['calendar-events', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'), locationFilter],
        queryFn: () => api.getCalendarEvents({
            start_date: format(monthStart, 'yyyy-MM-dd'),
            end_date: format(monthEnd, 'yyyy-MM-dd'),
            location_id: locationFilter || undefined,
        }),
    });

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const start = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = [];
        let day = start;
        while (day <= end) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    // Group events by date
    const eventsByDate = useMemo(() => {
        const map = {};
        (events || []).forEach(evt => {
            const dateKey = evt.start.split('T')[0];
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(evt);
        });
        return map;
    }, [events]);

    const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
    const selectedEvents = eventsByDate[selectedDateKey] || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Grid */}
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
                        <div className="flex items-center gap-3">
                            {/* Location filter */}
                            <select
                                value={locationFilter}
                                onChange={e => setLocationFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-white">All Locations</option>
                                {(locations || []).map(loc => (
                                    <option key={loc.id} value={loc.id} className="bg-white">{loc.code}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
                        ))}
                    </div>

                    {/* Calendar cells */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, i) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayEvents = eventsByDate[dateKey] || [];
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isSelected = isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);

                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    className={`relative min-h-[72px] p-1.5 rounded-xl text-left transition cursor-pointer ${
                                        isSelected
                                            ? 'bg-mimos-500/15 ring-2 ring-mimos-500/40'
                                            : 'hover:bg-slate-50'
                                    } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                                >
                                    <span className={`text-xs font-medium block mb-1 ${
                                        isTodayDate
                                            ? 'text-mimos-600'
                                            : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                                    }`}>
                                        {format(day, 'd')}
                                    </span>

                                    {/* Event dots */}
                                    {dayEvents.length > 0 && (
                                        <div className="flex flex-wrap gap-0.5">
                                            {dayEvents.slice(0, 3).map((evt, j) => (
                                                <div
                                                    key={j}
                                                    className="w-full text-[9px] px-1 py-0.5 rounded bg-mimos-500/15 text-mimos-400 truncate"
                                                    title={evt.title}
                                                >
                                                    {evt.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <span className="text-[9px] text-slate-500">+{dayEvents.length - 3} more</span>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Details */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 sticky top-24">
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            {selectedEvents.length} booking{selectedEvents.length !== 1 ? 's' : ''}
                        </p>

                        {selectedEvents.length === 0 && (
                            <div className="text-center py-8 text-slate-600 text-sm">
                                No bookings on this date
                            </div>
                        )}

                        <div className="space-y-3">
                            {selectedEvents.map((evt) => (
                                <div key={evt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="text-sm font-medium text-slate-900 mb-1">{evt.title}</div>
                                    <div className="space-y-1 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3" />
                                            {evt.room} · {evt.location}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" />
                                            {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {' – '}
                                            {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3 h-3" />
                                            {evt.booked_by}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
