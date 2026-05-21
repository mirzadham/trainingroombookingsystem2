import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, Clock, MapPin, Users, Filter, CheckSquare, Square, Ban, Search, ChevronDown, ChevronUp, CalendarDays, Building2, DoorOpen, RotateCcw } from 'lucide-react';
import * as api from '../../services/api';
import BookingCard from '../../components/BookingCard';
import BookingDetailsModal from '../../components/BookingDetailsModal';

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
    
    // Admin cancel state
    const [cancellingId, setCancellingId] = useState(null);
    const [cancelRemarks, setCancelRemarks] = useState('');
    const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
    
    // Batch operations state
    const [selectedIds, setSelectedIds] = useState([]);
    const [batchReason, setBatchReason] = useState('');
    const [showBatchReject, setShowBatchReject] = useState(false);

    // Advanced filter state
    const [showFilters, setShowFilters] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [roomFilter, setRoomFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchTimerRef = React.useRef(null);

    const handleSearchChange = (value) => {
        setSearchText(value);
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(value);
        }, 400);
    };

    const queryClient = useQueryClient();

    // Build query params from all filters
    const queryParams = useMemo(() => {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (debouncedSearch) params.search = debouncedSearch;
        if (locationFilter) params.location_id = locationFilter;
        if (roomFilter) params.room_id = roomFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        return params;
    }, [statusFilter, debouncedSearch, locationFilter, roomFilter, dateFrom, dateTo]);

    // Count active advanced filters (excluding status which is always visible)
    const activeFilterCount = [debouncedSearch, locationFilter, roomFilter, dateFrom, dateTo].filter(Boolean).length;

    const { data, isLoading } = useQuery({
        queryKey: ['admin-bookings', queryParams],
        queryFn: () => api.getAdminBookings(queryParams),
    });

    // Fetch locations for filter dropdown
    const { data: locationsData } = useQuery({
        queryKey: ['locations'],
        queryFn: () => api.getLocations(),
        staleTime: 5 * 60 * 1000,
    });

    // Fetch rooms for filter dropdown (all admin rooms)
    const { data: roomsData } = useQuery({
        queryKey: ['admin-rooms'],
        queryFn: () => api.getAdminRooms(),
        staleTime: 5 * 60 * 1000,
    });

    const locations = locationsData || [];
    const allRooms = roomsData?.data || roomsData || [];

    // Filter rooms by selected location
    const filteredRooms = useMemo(() => {
        if (!locationFilter) return allRooms;
        return allRooms.filter(r => String(r.location_id) === String(locationFilter));
    }, [allRooms, locationFilter]);

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

    // Admin cancel mutation
    const adminCancelMutation = useMutation({
        mutationFn: ({ id, remarks }) => api.adminCancelBooking(id, remarks),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
            setCancellingId(null);
            setCancelRemarks('');
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
    const monthGroups = useMemo(() => {
        const map = new Map();
        bookings.forEach(b => {
            const dt = new Date(b.start_time);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            const label = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!map.has(key)) map.set(key, { label, bookings: [] });
            map.get(key).bookings.push(b);
        });
        return map;
    }, [bookings]);
    
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

    const clearAdvancedFilters = () => {
        setSearchText('');
        setDebouncedSearch('');
        setLocationFilter('');
        setRoomFilter('');
        setDateFrom('');
        setDateTo('');
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
            <div className="flex gap-2 mb-4 flex-wrap">
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

            {/* Advanced Filters Toggle */}
            <div className="mb-6">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition cursor-pointer border ${
                        showFilters || activeFilterCount > 0
                            ? 'bg-mimos-50 text-mimos-700 border-mimos-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    Advanced Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-gradient-to-r from-mimos-500 to-mimos-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {activeFilterCount}
                        </span>
                    )}
                    {showFilters ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                </button>

                {/* Advanced Filters Panel */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {/* Search */}
                            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <Search className="w-3 h-3" />
                                    Search
                                </label>
                                <div className="relative">
                                    <input
                                        id="filter-search"
                                        type="text"
                                        value={searchText}
                                        onChange={e => handleSearchChange(e.target.value)}
                                        placeholder="Title, user name, email, or ID..."
                                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/30 focus:border-mimos-300 transition"
                                    />
                                    {searchText && (
                                        <button
                                            onClick={() => handleSearchChange('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <Building2 className="w-3 h-3" />
                                    Location
                                </label>
                                <select
                                    id="filter-location"
                                    value={locationFilter}
                                    onChange={e => {
                                        setLocationFilter(e.target.value);
                                        setRoomFilter(''); // Reset room when location changes
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-mimos-500/30 focus:border-mimos-300 transition cursor-pointer appearance-none"
                                >
                                    <option value="">All Locations</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Room */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <DoorOpen className="w-3 h-3" />
                                    Room
                                </label>
                                <select
                                    id="filter-room"
                                    value={roomFilter}
                                    onChange={e => setRoomFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-mimos-500/30 focus:border-mimos-300 transition cursor-pointer appearance-none"
                                >
                                    <option value="">All Rooms</option>
                                    {filteredRooms.map(room => (
                                        <option key={room.id} value={room.id}>{room.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="sm:col-span-2 lg:col-span-1">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <CalendarDays className="w-3 h-3" />
                                    Date Range
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        id="filter-date-from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-mimos-500/30 focus:border-mimos-300 transition cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-400 font-medium flex-shrink-0">to</span>
                                    <input
                                        id="filter-date-to"
                                        type="date"
                                        value={dateTo}
                                        onChange={e => setDateTo(e.target.value)}
                                        className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-mimos-500/30 focus:border-mimos-300 transition cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Active filters summary + clear */}
                        {activeFilterCount > 0 && (
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-500 font-medium">Active:</span>
                                    {debouncedSearch && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-mimos-50 text-mimos-700 text-[11px] font-semibold rounded-lg border border-mimos-200">
                                            Search: "{debouncedSearch}"
                                            <button onClick={() => handleSearchChange('')} className="hover:text-mimos-900 cursor-pointer"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {locationFilter && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-200">
                                            Location: {locations.find(l => String(l.id) === String(locationFilter))?.code || locationFilter}
                                            <button onClick={() => { setLocationFilter(''); setRoomFilter(''); }} className="hover:text-blue-900 cursor-pointer"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {roomFilter && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-[11px] font-semibold rounded-lg border border-violet-200">
                                            Room: {allRooms.find(r => String(r.id) === String(roomFilter))?.name || roomFilter}
                                            <button onClick={() => setRoomFilter('')} className="hover:text-violet-900 cursor-pointer"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {dateFrom && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200">
                                            From: {dateFrom}
                                            <button onClick={() => setDateFrom('')} className="hover:text-emerald-900 cursor-pointer"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {dateTo && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200">
                                            To: {dateTo}
                                            <button onClick={() => setDateTo('')} className="hover:text-emerald-900 cursor-pointer"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={clearAdvancedFilters}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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

            {!isLoading && bookings.length > 0 && (
                <div className="space-y-8">
                    {[...monthGroups.entries()].map(([key, { label, bookings: groupBookings }]) => (
                        <div key={key} className="space-y-4">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] mb-6 mt-8 first:mt-0 flex items-center gap-4 select-none">
                                <span>{label.toUpperCase()}</span>
                                <span className="flex-1 h-px bg-slate-200/80" />
                            </div>
                            <div className="space-y-3">
                                {groupBookings.map((booking) => (
                                    <div key={booking.id} className="space-y-2">
                                        <BookingCard
                                            booking={booking}
                                            isAdmin={true}
                                            showCheckbox={isPendingTab}
                                            isSelected={selectedIds.includes(booking.id)}
                                            onSelect={() => handleSelectOne(booking.id)}
                                            onViewDetails={setSelectedBookingDetails}
                                            onApprove={(id) => approveMutation.mutate(id)}
                                            onReject={(id) => {
                                                setRejectingId(id);
                                                setRejectReason('');
                                                setCancellingId(null);
                                            }}
                                            onCancel={(id) => {
                                                setCancellingId(id);
                                                setCancelRemarks('');
                                                setRejectingId(null);
                                            }}
                                            isActionPending={approveMutation.isPending || rejectMutation.isPending || adminCancelMutation.isPending}
                                            actioningId={approveMutation.variables || rejectMutation.variables?.id || adminCancelMutation.variables?.id}
                                        />

                                        {/* Inline Rejection Form */}
                                        {rejectingId === booking.id && (
                                            <div className="bg-slate-50 border border-red-200/60 rounded-3xl p-5 flex gap-3 animate-in slide-in-from-top-2 duration-200">
                                                <input
                                                    type="text"
                                                    value={rejectReason}
                                                    onChange={e => setRejectReason(e.target.value)}
                                                    placeholder="Enter rejection reason (required)"
                                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => rejectMutation.mutate({ id: booking.id, reason: rejectReason })}
                                                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white border-0 rounded-xl text-sm font-semibold disabled:opacity-50 transition cursor-pointer"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                                    className="px-4 py-2.5 bg-slate-100 text-slate-650 rounded-xl text-sm font-semibold hover:bg-slate-200 transition cursor-pointer border-0"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                        {/* Inline Cancel Form (for approved bookings) */}
                                        {cancellingId === booking.id && (
                                            <div className="bg-slate-50 border border-amber-250/60 rounded-3xl p-5 flex gap-3 animate-in slide-in-from-top-2 duration-200">
                                                <input
                                                    type="text"
                                                    value={cancelRemarks}
                                                    onChange={e => setCancelRemarks(e.target.value)}
                                                    placeholder="Enter cancellation remarks (required)"
                                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => adminCancelMutation.mutate({ id: booking.id, remarks: cancelRemarks })}
                                                    disabled={!cancelRemarks.trim() || adminCancelMutation.isPending}
                                                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white border-0 rounded-xl text-sm font-semibold disabled:opacity-50 transition cursor-pointer"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => { setCancellingId(null); setCancelRemarks(''); }}
                                                    className="px-4 py-2.5 bg-slate-100 text-slate-650 rounded-xl text-sm font-semibold hover:bg-slate-200 transition cursor-pointer border-0"
                                                >
                                                    Back
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

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

            {/* View More Details Modal */}
            {selectedBookingDetails && (
                <BookingDetailsModal
                    booking={selectedBookingDetails}
                    onClose={() => setSelectedBookingDetails(null)}
                    isAdmin={true}
                    onApprove={async (id) => {
                        await approveMutation.mutateAsync(id);
                        setSelectedBookingDetails(null);
                    }}
                    onReject={(id, reason) => rejectMutation.mutateAsync({ id, reason })}
                    onCancel={(id, remarks) => adminCancelMutation.mutateAsync({ id, remarks })}
                    isActionPending={approveMutation.isPending || rejectMutation.isPending || adminCancelMutation.isPending}
                />
            )}
        </div>
    );
}
