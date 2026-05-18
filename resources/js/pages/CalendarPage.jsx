import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MapPin, Clock, User, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO, min, max } from 'date-fns';
import { Link } from 'react-router-dom';
import * as api from '../services/api';

const ROOM_COLORS = [
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
];

const getRoomColor = (roomId) => {
    if (!roomId) return ROOM_COLORS[0];
    return ROOM_COLORS[roomId % ROOM_COLORS.length];
};

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
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const { data: rawEvents, isLoading } = useQuery({
        queryKey: ['calendar-events', format(calendarStart, 'yyyy-MM-dd'), format(calendarEnd, 'yyyy-MM-dd'), locationFilter],
        queryFn: () => api.getCalendarEvents({
            start_date: format(calendarStart, 'yyyy-MM-dd'),
            end_date: format(calendarEnd, 'yyyy-MM-dd'),
            location_id: locationFilter || undefined,
        }),
    });

    // 1. Group events by group_id
    const events = useMemo(() => {
        if (!rawEvents) return [];
        
        const grouped = new Map();
        const standalone = [];
        
        rawEvents.forEach(evt => {
            if (evt.group_id) {
                if (!grouped.has(evt.group_id)) {
                    grouped.set(evt.group_id, { ...evt, _rawEvents: [evt] });
                } else {
                    const group = grouped.get(evt.group_id);
                    group._rawEvents.push(evt);
                    const evtStart = parseISO(evt.start);
                    const evtEnd = parseISO(evt.end);
                    const groupStart = parseISO(group.start);
                    const groupEnd = parseISO(group.end);
                    
                    if (evtStart < groupStart) group.start = evt.start;
                    if (evtEnd > groupEnd) group.end = evt.end;
                }
            } else {
                standalone.push({ ...evt, _rawEvents: [evt] });
            }
        });
        
        return [...Array.from(grouped.values()), ...standalone];
    }, [rawEvents]);

    // 2. Build weeks
    const weeks = useMemo(() => {
        const weeksArray = [];
        let currentDay = calendarStart;
        
        while (currentDay <= calendarEnd) {
            const weekDays = [];
            for (let i = 0; i < 7; i++) {
                weekDays.push(currentDay);
                currentDay = addDays(currentDay, 1);
            }
            weeksArray.push(weekDays);
        }
        return weeksArray;
    }, [calendarStart, calendarEnd]);

    // Calculate events for selected date details
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const selectedEvents = useMemo(() => {
        if (!rawEvents) return [];
        // Use rawEvents to display individual daily slots in the sidebar
        return rawEvents.filter(evt => {
            const startStr = evt.start.split('T')[0];
            const endStr = evt.end.split('T')[0];
            return selectedDateStr >= startStr && selectedDateStr <= endStr;
        });
    }, [rawEvents, selectedDateStr]);


    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Grid */}
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
                        <div className="flex items-center gap-3">
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
                            
                            <Link
                                to="/"
                                className="flex items-center gap-2 px-4 py-2 bg-mimos-600 hover:bg-mimos-700 text-white text-sm font-medium rounded-xl transition shadow-sm hover:shadow"
                            >
                                <Plus className="w-4 h-4" />
                                Book a Room
                            </Link>
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
                    <div className="grid grid-cols-7 gap-px mb-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
                        ))}
                    </div>

                    {/* Calendar Body */}
                    <div className="bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden flex flex-col gap-px">
                        {weeks.map((week, weekIdx) => {
                            const weekStart = week[0];
                            const weekEnd = week[6];
                            
                            // Filter events for this week
                            const weekEvents = events.filter(evt => {
                                const eStart = parseISO(evt.start);
                                const eEnd = parseISO(evt.end);
                                // overlaps with week
                                return eStart <= addDays(weekEnd, 1) && eEnd >= weekStart;
                            });

                            // Sort: start date, then duration desc
                            weekEvents.sort((a, b) => {
                                const aStart = parseISO(a.start).getTime();
                                const bStart = parseISO(b.start).getTime();
                                if (aStart !== bStart) return aStart - bStart;
                                const aDur = parseISO(a.end) - parseISO(a.start);
                                const bDur = parseISO(b.end) - parseISO(b.start);
                                return bDur - aDur;
                            });

                            // Pack events into tracks (rows)
                            const tracks = [];
                            const eventTracks = new Map();
                            
                            weekEvents.forEach(evt => {
                                const eStart = parseISO(evt.start);
                                const eEnd = parseISO(evt.end);
                                
                                let trackIdx = 0;
                                while (true) {
                                    if (!tracks[trackIdx]) {
                                        tracks[trackIdx] = [evt];
                                        eventTracks.set(evt.id, trackIdx);
                                        break;
                                    }
                                    
                                    const overlaps = tracks[trackIdx].some(trackEvt => {
                                        const tStart = parseISO(trackEvt.start);
                                        const tEnd = parseISO(trackEvt.end);
                                        // strict overlap check by day
                                        const evtStartDayStr = format(eStart, 'yyyy-MM-dd');
                                        const evtEndDayStr = format(eEnd, 'yyyy-MM-dd');
                                        const tStartDayStr = format(tStart, 'yyyy-MM-dd');
                                        const tEndDayStr = format(tEnd, 'yyyy-MM-dd');
                                        
                                        return evtStartDayStr <= tEndDayStr && evtEndDayStr >= tStartDayStr;
                                    });
                                    
                                    if (!overlaps) {
                                        tracks[trackIdx].push(evt);
                                        eventTracks.set(evt.id, trackIdx);
                                        break;
                                    }
                                    trackIdx++;
                                }
                            });

                            const minHeight = Math.max(120, 40 + tracks.length * 28 + 10);

                            return (
                                <div key={weekIdx} className="grid grid-cols-7 gap-px relative bg-transparent" style={{ minHeight: `${minHeight}px` }}>
                                    {/* Days Background Grid */}
                                    {week.map((day, dayIdx) => {
                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                        const isSelected = isSameDay(day, selectedDate);
                                        const isTodayDate = isToday(day);
                                        
                                        return (
                                            <div 
                                                key={dayIdx} 
                                                onClick={() => setSelectedDate(day)}
                                                className={`p-2 cursor-pointer transition-colors bg-white relative ${
                                                    isSelected ? '!bg-mimos-50/50 ring-2 ring-mimos-500 ring-inset z-10' : 'hover:!bg-slate-50/50'
                                                } ${!isCurrentMonth ? '!bg-slate-50/50' : ''}`}
                                            >
                                                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium mb-1 ${
                                                    isTodayDate 
                                                        ? 'bg-mimos-600 text-white' 
                                                        : isSelected 
                                                            ? 'bg-mimos-100 text-mimos-700 ring-2 ring-mimos-500/30'
                                                            : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                                                }`}>
                                                    {format(day, 'd')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Event Bars */}
                                    {weekEvents.map(evt => {
                                        const eStart = parseISO(evt.start);
                                        const eEnd = parseISO(evt.end);
                                        
                                        // clamp start and end to week bounds
                                        const startDay = max([eStart, weekStart]);
                                        const endDay = min([eEnd, weekEnd]);
                                        
                                        // indices (0-6)
                                        const startIdx = week.findIndex(d => isSameDay(d, startDay));
                                        const endIdx = week.findIndex(d => isSameDay(d, endDay));
                                        
                                        // fallback if not found (shouldn't happen with clamped dates)
                                        const safeStartIdx = startIdx >= 0 ? startIdx : 0;
                                        const safeEndIdx = endIdx >= 0 ? endIdx : 6;
                                        const span = safeEndIdx - safeStartIdx + 1;
                                        
                                        const track = eventTracks.get(evt.id);
                                        const colorClass = getRoomColor(evt.room_id);
                                        const continuesPrior = format(eStart, 'yyyy-MM-dd') < format(weekStart, 'yyyy-MM-dd');
                                        const continuesAfter = format(eEnd, 'yyyy-MM-dd') > format(weekEnd, 'yyyy-MM-dd');

                                        return (
                                            <div
                                                key={evt.id}
                                                className={`absolute h-6 px-2.5 flex items-center text-xs border truncate shadow-sm transition-opacity hover:opacity-90 cursor-pointer z-10
                                                    ${colorClass}
                                                    ${continuesPrior ? 'rounded-l-none border-l-0' : 'rounded-l-md ml-1'}
                                                    ${continuesAfter ? 'rounded-r-none border-r-0' : 'rounded-r-md mr-1'}
                                                `}
                                                style={{
                                                    top: `${40 + track * 28}px`,
                                                    left: `calc(${safeStartIdx} * (100% / 7))`,
                                                    width: `calc(${span} * (100% / 7) - ${continuesPrior ? '0px' : '4px'} - ${continuesAfter ? '0px' : '4px'})`,
                                                }}
                                                title={evt.title}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDate(startDay);
                                                }}
                                            >
                                                <span className="font-semibold mr-1.5 truncate">{evt.title}</span>
                                                <span className="opacity-80 truncate hidden sm:inline">
                                                    · {evt.room}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
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
                            {selectedEvents.map((evt) => {
                                const colorClass = getRoomColor(evt.room_id);
                                return (
                                    <div key={evt.id} className={`p-4 rounded-xl border ${colorClass} shadow-sm relative overflow-hidden bg-white/50`}>
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-40"></div>
                                        <div className="text-slate-900 relative">
                                            <div className="text-sm font-bold mb-2 pr-4">{evt.title}</div>
                                            <div className="space-y-2 text-xs opacity-90">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span className="font-medium">{evt.room}</span> 
                                                    <span className="opacity-75">· {evt.location}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {' – '}
                                                    {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5" />
                                                    {evt.booked_by}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
