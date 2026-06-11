import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Users, Plus, AlertCircle, Loader2, Search, Check, ShieldAlert, Phone, Mail, Building2, User } from 'lucide-react';
import * as api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function AdminBookingModal({ onClose, onSuccess }) {
    const { adminUser } = useAuth();
    const queryClient = useQueryClient();

    // Booker details state
    const [bookerType, setBookerType] = useState('registered'); // 'registered' or 'guest'
    const [searchTerm, setSearchTerm] = useState('');
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Guest details state
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    // Booking detail states
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [attendees, setAttendees] = useState('');
    const [phone, setPhone] = useState('');
    const [bypassValidation, setBypassValidation] = useState(false);
    const [formError, setFormError] = useState('');

    // 1. Fetch Locations for Admin
    const { data: locationsData } = useQuery({
        queryKey: ['locations'],
        queryFn: () => api.getLocations(),
        staleTime: 5 * 60 * 1000,
    });
    const locations = locationsData || [];

    // 2. Fetch Rooms for Admin
    const { data: roomsData } = useQuery({
        queryKey: ['admin-rooms'],
        queryFn: () => api.getAdminRooms(),
        staleTime: 5 * 60 * 1000,
    });
    const allRooms = roomsData?.data || roomsData || [];

    // Auto-lock location for Location Admin
    const isSuperAdmin = adminUser?.role === 'super_admin';
    useEffect(() => {
        if (!isSuperAdmin && adminUser?.location_id) {
            setSelectedLocationId(String(adminUser.location_id));
        }
    }, [adminUser, isSuperAdmin]);

    // Filter rooms by location
    const filteredRooms = useMemo(() => {
        if (!selectedLocationId) return [];
        return allRooms.filter(r => String(r.location_id) === String(selectedLocationId));
    }, [allRooms, selectedLocationId]);

    // Auto-select room if only one is available
    useEffect(() => {
        if (filteredRooms.length === 1) {
            setSelectedRoomId(String(filteredRooms[0].id));
        } else {
            setSelectedRoomId('');
        }
    }, [filteredRooms]);

    // User Search Debounce Effect
    useEffect(() => {
        if (!searchTerm.trim()) {
            setUserSuggestions([]);
            return;
        }
        setIsSearchingUsers(true);
        const delay = setTimeout(() => {
            api.adminSearchUsers(searchTerm)
                .then(data => {
                    setUserSuggestions(data);
                })
                .catch(() => {
                    setUserSuggestions([]);
                })
                .finally(() => {
                    setIsSearchingUsers(false);
                });
        }, 300);

        return () => clearTimeout(delay);
    }, [searchTerm]);

    // Update phone field when booker changes
    useEffect(() => {
        if (bookerType === 'registered' && selectedUser) {
            setPhone(selectedUser.phone || '');
        } else if (bookerType === 'guest') {
            setPhone(guestPhone);
        }
    }, [bookerType, selectedUser, guestPhone]);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setSearchTerm('');
        setUserSuggestions([]);
        setFormError('');
    };

    // Create Booking Mutation
    const createMutation = useMutation({
        mutationFn: (data) => api.adminCreateBooking(data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
            alert(res.message || 'Booking created successfully!');
            if (onSuccess) onSuccess();
            onClose();
        },
        onError: (err) => {
            const errors = err.response?.data?.errors;
            if (errors) {
                // Flatten and display first validation error
                const firstErrorKey = Object.keys(errors)[0];
                setFormError(errors[firstErrorKey][0]);
            } else {
                setFormError(err.response?.data?.message || err.message || 'Failed to create booking.');
            }
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');

        if (bookerType === 'registered' && !selectedUser) {
            setFormError('Please search and select a registered user.');
            return;
        }
        if (bookerType === 'guest') {
            if (!guestName.trim()) {
                setFormError('Guest name is required.');
                return;
            }
            if (!guestEmail.trim()) {
                setFormError('Guest email is required.');
                return;
            }
        }
        if (!selectedRoomId) {
            setFormError('Please select a Room.');
            return;
        }
        if (!startDate) {
            setFormError('Please select a date.');
            return;
        }
        if (!startTime) {
            setFormError('Please select a start time.');
            return;
        }
        if (!endTime) {
            setFormError('Please select an end time.');
            return;
        }
        if (!title.trim()) {
            setFormError('Booking purpose / title is required.');
            return;
        }
        if (!attendees || parseInt(attendees) < 1) {
            setFormError('Attendees count must be at least 1.');
            return;
        }

        // Build parameters
        // Standard payload requires start_time & end_time as strings in local format
        // e.g. "2026-06-15 09:00:00"
        const startTimeStr = `${startDate} ${startTime}:00`;
        // If end_date is provided and different, it is a multi-day range
        const finalEndDate = endDate && endDate !== startDate ? endDate : startDate;
        const endTimeStr = `${finalEndDate} ${endTime}:00`;

        const payload = {
            room_id: parseInt(selectedRoomId),
            title: title.trim(),
            description: description.trim() || null,
            start_date: startDate,
            end_date: finalEndDate,
            start_time: startTimeStr,
            end_time: endTimeStr,
            attendees: parseInt(attendees),
            booker_type: bookerType,
            bypass_validation: bypassValidation ? 1 : 0,
        };

        if (bookerType === 'registered') {
            payload.user_id = selectedUser.id;
            payload.guest_phone = phone;
        } else {
            payload.guest_name = guestName.trim();
            payload.guest_email = guestEmail.trim();
            payload.guest_phone = phone.trim();
        }

        createMutation.mutate(payload);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 animate-slide-up">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-mimos-600" />
                            Create & Approve Booking
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Book a room on behalf of a user or guest. Direct approval will bypass the pending queue.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-650 p-2 hover:bg-slate-100 rounded-full transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {formError && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-start gap-3 shadow-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Section 1: Booker details */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">1. Booker Association</h4>
                            <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/40">
                                <button
                                    type="button"
                                    onClick={() => { setBookerType('registered'); setSelectedUser(null); setFormError(''); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        bookerType === 'registered'
                                            ? 'bg-white text-mimos-600 shadow-sm border border-slate-200/50'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Registered User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setBookerType('guest'); setFormError(''); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        bookerType === 'guest'
                                            ? 'bg-white text-mimos-600 shadow-sm border border-slate-200/50'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Guest Booker
                                </button>
                            </div>
                        </div>

                        {bookerType === 'registered' ? (
                            <div className="space-y-3">
                                {!selectedUser ? (
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search registered user by name, email, or phone..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                                        />
                                        {isSearchingUsers && (
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-4 h-4 text-mimos-500 animate-spin" />
                                            </div>
                                        )}

                                        {/* Suggestions Dropdown */}
                                        {userSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                                                {userSuggestions.map((usr) => (
                                                    <button
                                                        key={usr.id}
                                                        type="button"
                                                        onClick={() => handleSelectUser(usr)}
                                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition group cursor-pointer"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900 group-hover:text-mimos-600">{usr.name}</div>
                                                            <div className="text-xs text-slate-400 font-medium">{usr.email} • {usr.department || 'No Dept'}</div>
                                                        </div>
                                                        <Plus className="w-4 h-4 text-slate-300 group-hover:text-mimos-600" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-mimos-500/5 border border-mimos-200/50 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1.5 duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-mimos-600/10 flex items-center justify-center text-mimos-600 shrink-0">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{selectedUser.name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{selectedUser.email} • {selectedUser.department || 'No Dept'}</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedUser(null)}
                                            className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition cursor-pointer"
                                        >
                                            Change User
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Booker Name *</label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        placeholder="Enter guest booker name"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Booker Email *</label>
                                    <input
                                        type="email"
                                        value={guestEmail}
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                        placeholder="guest@example.com"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Booker Phone (Optional)</label>
                                    <input
                                        type="text"
                                        value={guestPhone}
                                        onChange={(e) => setGuestPhone(e.target.value)}
                                        placeholder="e.g. +60123456789"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Section 2: Room & Date/Time selection */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">2. Room & Schedule</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Location */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Location *</label>
                                <select
                                    value={selectedLocationId}
                                    onChange={(e) => {
                                        setSelectedLocationId(e.target.value);
                                        setSelectedRoomId('');
                                    }}
                                    disabled={!isSuperAdmin}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 disabled:bg-slate-150 disabled:cursor-not-allowed cursor-pointer appearance-none"
                                >
                                    <option value="">Select Location</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Room */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Room *</label>
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => setSelectedRoomId(e.target.value)}
                                    disabled={!selectedLocationId}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 disabled:bg-slate-150 disabled:cursor-not-allowed cursor-pointer appearance-none"
                                >
                                    {filteredRooms.length === 0 ? (
                                        <option value="">No Rooms Available</option>
                                    ) : (
                                        <>
                                            <option value="">Select Room</option>
                                            {filteredRooms.map(room => (
                                                <option key={room.id} value={room.id}>{room.name} (Cap: {room.capacity})</option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Date(s) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Start Date *</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        if (!endDate) setEndDate(e.target.value);
                                    }}
                                    onClick={(e) => e.target.showPicker()}
                                    onFocus={(e) => e.target.showPicker()}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">End Date (Optional, for consecutive multi-day)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    onClick={(e) => e.target.showPicker()}
                                    onFocus={(e) => e.target.showPicker()}
                                    min={startDate}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 cursor-pointer"
                                />
                            </div>

                            {/* Time Slots */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Start Time *</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    onClick={(e) => e.target.showPicker()}
                                    onFocus={(e) => e.target.showPicker()}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">End Time *</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    onClick={(e) => e.target.showPicker()}
                                    onFocus={(e) => e.target.showPicker()}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Section 3: Booking details */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">3. Booking Information</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Purpose / Event Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. React Workshop, Internal Meeting"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Attendees Count *</label>
                                <input
                                    type="number"
                                    value={attendees}
                                    onChange={(e) => setAttendees(e.target.value)}
                                    placeholder="e.g. 15"
                                    min="1"
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Contact Phone Number *</label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g. +60123456789"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Event Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add any extra notes or requirements..."
                                    rows="3"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/30 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Section 4: Rules Bypass */}
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Bypass standard restrictions</h5>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                    Check this to bypass minor validation checks (operating hours, maximum booking duration, and room capacity limits).
                                    Room availability conflicts and blackout schedules will still be strictly enforced.
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={bypassValidation}
                                onChange={(e) => setBypassValidation(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                    </div>
                </form>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-mimos-600 hover:bg-mimos-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition cursor-pointer"
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Create & Approve Booking
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
