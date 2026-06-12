import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MapPin, Clock, User, Plus, Lock, CalendarOff, AlertCircle, Check, X, Ban, RefreshCw, CalendarCheck, Mail } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO, min, max } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import * as api from '../../services/api';
import BookingDetailsModal from '../../components/BookingDetailsModal';
import AdminBookingModal from '../../components/admin/AdminBookingModal';

const ROOM_COLORS = [
    'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100/70',
    'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70',
    'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100/70',
    'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/70',
    'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/70',
    'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70',
];

const getRoomColor = (roomId) => {
    if (!roomId) return ROOM_COLORS[0];
    return ROOM_COLORS[roomId % ROOM_COLORS.length];
};

export default function AdminCalendar() {
    const { adminUser } = useAuth();
    const queryClient = useQueryClient();
    const isSuperAdmin = adminUser?.role === 'super_admin';

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [locationFilter, setLocationFilter] = useState('');
    const [roomFilter, setRoomFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal States
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);

    // Auto-lock location filter for Location Admins
    React.useEffect(() => {
        if (!isSuperAdmin && adminUser?.location_id) {
            setLocationFilter(String(adminUser.location_id));
        }
    }, [adminUser, isSuperAdmin]);

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
        staleTime: 5 * 60 * 1000,
    });

    const { data: roomsData } = useQuery({
        queryKey: ['admin-rooms'],
        queryFn: api.getAdminRooms,
        staleTime: 5 * 60 * 1000,
    });

    const rooms = roomsData?.data || roomsData || [];

    const filteredRooms = useMemo(() => {
        if (!locationFilter) return rooms;
        return rooms.filter(r => String(r.location_id) === String(locationFilter));
    }, [rooms, locationFilter]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarParams = useMemo(() => {
        return {
            start_date: format(calendarStart, 'yyyy-MM-dd'),
            end_date: format(calendarEnd, 'yyyy-MM-dd'),
            location_id: locationFilter || undefined,
            room_id: roomFilter || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
        };
    }, [calendarStart, calendarEnd, locationFilter, roomFilter, statusFilter]);

    const { data: rawEvents, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['admin-calendar-events', calendarParams],
        queryFn: () => api.getAdminCalendarEvents(calendarParams),
        enabled: !!adminUser,
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
        return rawEvents.filter(evt => {
            const startStr = evt.start.split('T')[0];
            const endStr = evt.end.split('T')[0];
            return selectedDateStr >= startStr && selectedDateStr <= endStr;
        });
    }, [rawEvents, selectedDateStr]);

    // Admin Actions Mutations
    const approveMutation = useMutation({
        mutationFn: (id) => api.approveBooking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
        },
        onError: (err) => {
            alert(err.response?.data?.message || err.message || 'Failed to approve booking.');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => api.rejectBooking(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
        },
        onError: (err) => {
            alert(err.response?.data?.message || err.message || 'Failed to reject booking.');
        }
    });

    const adminCancelMutation = useMutation({
        mutationFn: ({ id, remarks }) => api.adminCancelBooking(id, remarks),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
        },
        onError: (err) => {
            alert(err.response?.data?.message || err.message || 'Failed to cancel booking.');
        }
    });

    // Helper to format date nicely
    const formatTime12 = (isoStr) => {
        if (!isoStr) return '';
        return new Date(isoStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 select-none">
                        <CalendarCheck className="w-6 h-6 text-mimos-600 animate-pulse" />
                        Admin Calendar
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 select-none">View and manage all room schedules, pending bookings, and blackout periods</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-sm cursor-pointer"
                        title="Reload Events"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowBookingModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-mimos-600 hover:bg-mimos-700 text-white text-sm font-semibold rounded-xl transition shadow-sm hover:shadow cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Book Room
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-xs flex flex-wrap gap-4 items-center">
                {/* Location Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</label>
                    <select
                        value={locationFilter}
                        onChange={e => {
                            setLocationFilter(e.target.value);
                            setRoomFilter('');
                        }}
                        disabled={!isSuperAdmin}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-mimos-500/30 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed appearance-none"
                    >
                        <option value="">All Locations</option>
                        {(locations || []).map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                        ))}
                    </select>
                </div>

                {/* Room Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Room</label>
                    <select
                        value={roomFilter}
                        onChange={e => setRoomFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-mimos-500/30 cursor-pointer appearance-none"
                    >
                        <option value="">All Rooms</option>
                        {filteredRooms.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Events</label>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-mimos-500/30 cursor-pointer appearance-none"
                    >
                        <option value="all">All (Bookings & Blackouts)</option>
                        <option value="approved">Approved Bookings Only</option>
                        <option value="pending">Pending Bookings Only</option>
                        <option value="blackout">Blackouts / Maintenance Only</option>
                        <option value="cancelled">Cancelled Bookings Only</option>
                    </select>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* Calendar Main Grid */}
                <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                    {/* Month Nav */}
                    <div className="flex items-center justify-between mb-4 select-none">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 transition cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 transition cursor-pointer"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Day Names Header */}
                    <div className="grid grid-cols-7 gap-px mb-2 select-none">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
                            <div key={dayName} className="text-center text-[10px] font-bold text-slate-400 uppercase py-2">
                                {dayName}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Body */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-50/50 rounded-xl border border-slate-100">
                            <RefreshCw className="w-8 h-8 text-mimos-500 animate-spin" />
                            <span className="text-xs text-slate-400 mt-2.5 font-semibold">Loading scheduling data...</span>
                        </div>
                    ) : (
                        <div className="bg-slate-200 border border-slate-200/80 rounded-xl overflow-hidden flex flex-col gap-px relative">
                            {weeks.map((week, weekIdx) => {
                                const weekStart = week[0];
                                const weekEnd = week[6];
                                
                                // Filter events that overlap with this week
                                const weekEvents = events.filter(evt => {
                                    const eStart = parseISO(evt.start);
                                    const eEnd = parseISO(evt.end);
                                    return eStart <= addDays(weekEnd, 1) && eEnd >= weekStart;
                                });

                                // Sort events: start date ascending, then duration descending
                                weekEvents.sort((a, b) => {
                                    const aStart = parseISO(a.start).getTime();
                                    const bStart = parseISO(b.start).getTime();
                                    if (aStart !== bStart) return aStart - bStart;
                                    const aDur = parseISO(a.end) - parseISO(a.start);
                                    const bDur = parseISO(b.end) - parseISO(b.start);
                                    return bDur - aDur;
                                });

                                // Grid pack algorithm
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

                                const minHeight = Math.max(110, 38 + tracks.length * 26 + 10);

                                return (
                                    <div key={weekIdx} className="grid grid-cols-7 gap-px relative bg-transparent" style={{ minHeight: `${minHeight}px` }}>
                                        {/* Day Cell Backdrops */}
                                        {week.map((day, dayIdx) => {
                                            const isCurrentMonth = isSameMonth(day, currentMonth);
                                            const isSelected = isSameDay(day, selectedDate);
                                            const isTodayDate = isToday(day);
                                            
                                            return (
                                                <div 
                                                    key={dayIdx} 
                                                    onClick={() => setSelectedDate(day)}
                                                    className={`p-2 cursor-pointer transition-colors bg-white relative select-none ${
                                                        isSelected ? '!bg-mimos-50/40 ring-2 ring-mimos-500 ring-inset z-10' : 'hover:!bg-slate-50/70'
                                                    } ${!isCurrentMonth ? '!bg-slate-50/30 opacity-70' : ''}`}
                                                >
                                                    <div className={`flex items-center justify-center w-6.5 h-6.5 rounded-full text-xs font-bold ${
                                                        isTodayDate 
                                                            ? 'bg-mimos-600 text-white shadow-xs' 
                                                            : isSelected 
                                                                ? 'bg-mimos-100 text-mimos-700 ring-2 ring-mimos-500/20'
                                                                : isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                                                    }`}>
                                                        {format(day, 'd')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Overlay Event Bars */}
                                        {weekEvents.map(evt => {
                                            const eStart = parseISO(evt.start);
                                            const eEnd = parseISO(evt.end);
                                            
                                            const startDay = max([eStart, weekStart]);
                                            const endDay = min([eEnd, weekEnd]);
                                            
                                            const startIdx = week.findIndex(d => isSameDay(d, startDay));
                                            const endIdx = week.findIndex(d => isSameDay(d, endDay));
                                            
                                            const safeStartIdx = startIdx >= 0 ? startIdx : 0;
                                            const safeEndIdx = endIdx >= 0 ? endIdx : 6;
                                            const span = safeEndIdx - safeStartIdx + 1;
                                            
                                            const track = eventTracks.get(evt.id);
                                            const continuesPrior = format(eStart, 'yyyy-MM-dd') < format(weekStart, 'yyyy-MM-dd');
                                            const continuesAfter = format(eEnd, 'yyyy-MM-dd') > format(weekEnd, 'yyyy-MM-dd');

                                            // Determine styles based on booking type / status
                                            let eventStyleClass = '';
                                            let prefixIcon = null;

                                            if (evt.type === 'blackout') {
                                                eventStyleClass = 'bg-slate-100 text-slate-700 border-slate-300 font-semibold';
                                                prefixIcon = <Lock className="w-3 h-3 text-slate-500 mr-1 shrink-0" />;
                                            } else {
                                                if (evt.status === 'pending') {
                                                    eventStyleClass = 'bg-amber-50 text-amber-800 border-dashed border-amber-300 font-semibold';
                                                    prefixIcon = <Clock className="w-3 h-3 text-amber-600 mr-1 shrink-0 animate-pulse" />;
                                                } else if (evt.status === 'cancelled') {
                                                    eventStyleClass = 'bg-slate-100 text-slate-450 border-slate-200 line-through opacity-70';
                                                } else {
                                                    // Approved
                                                    eventStyleClass = getRoomColor(evt.room_id);
                                                }
                                            }

                                            return (
                                                <div
                                                    key={evt.id}
                                                    className={`absolute h-5.5 px-2 flex items-center text-[10px] border truncate shadow-xs transition-opacity hover:opacity-90 cursor-pointer z-10 select-none
                                                        ${eventStyleClass}
                                                        ${continuesPrior ? 'rounded-l-none border-l-0' : 'rounded-l-lg ml-0.5'}
                                                        ${continuesAfter ? 'rounded-r-none border-r-0' : 'rounded-r-lg mr-0.5'}
                                                    `}
                                                    style={{
                                                        top: `${36 + track * 25}px`,
                                                        left: `calc(${safeStartIdx} * (100% / 7))`,
                                                        width: `calc(${span} * (100% / 7) - ${continuesPrior ? '0px' : '2px'} - ${continuesAfter ? '0px' : '2px'})`,
                                                    }}
                                                    title={evt.title}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDate(startDay);
                                                        if (evt.type === 'booking') {
                                                            setSelectedBooking(evt);
                                                        }
                                                    }}
                                                >
                                                    {prefixIcon}
                                                    <span className="font-bold mr-1 truncate">{evt.title}</span>
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
                    )}
                </div>

                {/* Selected Date Details Sidebar */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 sticky top-24 w-full">
                        <div className="border-b border-slate-100 pb-3 mb-4 select-none">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Schedule Overview
                            </h3>
                            <div className="text-sm font-extrabold text-slate-800 mt-1">
                                {format(selectedDate, 'EEEE, MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium">
                                {selectedEvents.length} active scheduling block{selectedEvents.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {selectedEvents.length === 0 && (
                            <div className="text-center py-10 flex flex-col items-center">
                                <CalendarOff className="w-7 h-7 text-slate-300 mb-2" />
                                <span className="text-xs text-slate-450 font-bold">No scheduling blocks</span>
                                <button
                                    onClick={() => setShowBookingModal(true)}
                                    className="mt-3.5 text-xs font-bold text-mimos-600 hover:text-mimos-700 flex items-center gap-1.5 hover:underline cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Book for this date
                                </button>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                            {selectedEvents.map((evt) => {
                                const isBlackout = evt.type === 'blackout';
                                const isPending = evt.status === 'pending';
                                
                                let cardStyle = '';
                                let tagText = '';
                                let tagStyle = '';

                                if (isBlackout) {
                                    cardStyle = 'border-slate-200 bg-slate-50 text-slate-700';
                                    tagText = 'Blackout';
                                    tagStyle = 'bg-slate-200/80 text-slate-700 border-slate-350';
                                } else {
                                    if (isPending) {
                                        cardStyle = 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/50';
                                        tagText = 'Pending';
                                        tagStyle = 'bg-amber-50 text-amber-700 border-amber-250';
                                    } else if (evt.status === 'cancelled') {
                                        cardStyle = 'border-slate-150 bg-slate-50/40 opacity-70';
                                        tagText = 'Cancelled';
                                        tagStyle = 'bg-slate-100 text-slate-500 border-slate-200';
                                    } else {
                                        cardStyle = 'border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/30';
                                        tagText = 'Approved';
                                        tagStyle = 'bg-emerald-50 text-emerald-700 border-emerald-250';
                                    }
                                }

                                return (
                                    <div 
                                        key={evt.id} 
                                        onClick={() => {
                                            if (evt.type === 'booking') {
                                                setSelectedBooking(evt);
                                            }
                                        }}
                                        className={`p-4.5 rounded-2xl border ${cardStyle} shadow-xs transition duration-200 flex flex-col relative overflow-hidden ${!isBlackout ? 'cursor-pointer hover:shadow-xs' : ''}`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2 select-none">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] uppercase font-black tracking-wider border ${tagStyle}`}>
                                                {tagText}
                                            </span>
                                            <span className="text-[10px] text-slate-450 font-bold truncate max-w-[100px]">{evt.location}</span>
                                        </div>

                                        <div className={`text-xs font-bold text-slate-800 leading-tight ${evt.status === 'cancelled' ? 'line-through' : ''}`}>
                                            {evt.title}
                                        </div>

                                        <div className="space-y-1.5 text-[10px] font-semibold text-slate-500 mt-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-slate-450" />
                                                <span>{evt.room}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-445" />
                                                <span>{formatTime12(evt.start)} – {formatTime12(evt.end)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-slate-445" />
                                                <span className="truncate">{evt.booked_by}</span>
                                            </div>
                                            {evt.booked_by_email && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="w-3.5 h-3.5 text-slate-445" />
                                                    <span className="truncate">{evt.booked_by_email}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Inline Approve / Reject controls for Pending bookings */}
                                        {isPending && (
                                            <div className="flex gap-2 border-t border-amber-200/50 mt-4.5 pt-3 select-none">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Approve this request?')) {
                                                            approveMutation.mutate(evt.id);
                                                        }
                                                    }}
                                                    disabled={approveMutation.isPending}
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition border-0 cursor-pointer disabled:opacity-50"
                                                >
                                                    <Check className="w-3 h-3" /> Approve
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const reason = prompt('Enter rejection reason:');
                                                        if (reason && reason.trim()) {
                                                            rejectMutation.mutate({ id: evt.id, reason: reason.trim() });
                                                        }
                                                    }}
                                                    disabled={rejectMutation.isPending}
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition border-0 cursor-pointer disabled:opacity-50"
                                                >
                                                    <X className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>

            {/* Booking Details Modal */}
            {selectedBooking && (
                <BookingDetailsModal
                    booking={selectedBooking}
                    isAdmin={true}
                    onClose={() => setSelectedBooking(null)}
                    onApprove={(id) => approveMutation.mutateAsync(id)}
                    onReject={(id, reason) => rejectMutation.mutateAsync({ id, reason })}
                    onCancel={(id, remarks) => adminCancelMutation.mutateAsync({ id, remarks })}
                    isActionPending={approveMutation.isPending || rejectMutation.isPending || adminCancelMutation.isPending}
                />
            )}

            {/* Booking Wizard / Creation Modal */}
            {showBookingModal && (
                <AdminBookingModal
                    initialDate={format(selectedDate, 'yyyy-MM-dd')}
                    onClose={() => setShowBookingModal(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['admin-calendar-events'] });
                        queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
                    }}
                />
            )}
        </div>
    );
}
