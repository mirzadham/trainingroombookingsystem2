import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import * as api from '../services/api';

export default function SearchBar({
    initialLocation = '',
    initialDate = '',
    initialAttendees = '',
    onSearch,
    className = '',
    variant = 'default',
}) {
    const navigate = useNavigate();
    const [location, setLocation] = useState(initialLocation);
    const [date, setDate] = useState(initialDate);
    const [attendees, setAttendees] = useState(initialAttendees);

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!date) return;

        const filters = {
            location_id: location || undefined,
            date,
            attendees: attendees || undefined,
        };

        if (onSearch) {
            onSearch(filters);
        } else {
            const params = new URLSearchParams();
            if (filters.location_id) params.set('location_id', filters.location_id);
            params.set('date', filters.date);
            if (filters.attendees) params.set('attendees', filters.attendees);
            navigate(`/search?${params.toString()}`);
        }
    };

    // Minimal variant for header integration
    if (variant === 'minimal') {
        return (
            <form onSubmit={handleSubmit} className={className}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                    {/* Location */}
                    <div className="relative">
                        <label htmlFor="search-location-min" className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                            Location
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            <select
                                id="search-location-min"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition appearance-none cursor-pointer"
                            >
                                <option value="">All Locations</option>
                                {(locations || []).map(loc => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name} ({loc.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label htmlFor="search-date-min" className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                            Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            <input
                                id="search-date-min"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition [color-scheme:light]"
                            />
                        </div>
                    </div>

                    {/* Attendees */}
                    <div>
                        <label htmlFor="search-attendees-min" className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                            People
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            <input
                                id="search-attendees-min"
                                type="number"
                                value={attendees}
                                onChange={(e) => setAttendees(e.target.value)}
                                placeholder="e.g. 10"
                                min="1"
                                max="200"
                                className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition"
                            />
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <div className="mt-2 flex justify-end">
                    <button
                        type="submit"
                        className="group flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                        <Search className="w-4 h-4" />
                        Search
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </form>
        );
    }

    // Default variant (card-style, used on Home)
    return (
        <form onSubmit={handleSubmit} className={className}>
            <div className="bg-white/80 backdrop-blur-2xl border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Location */}
                    <div className="relative">
                        <label htmlFor="search-location" className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                            Location
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            <select
                                id="search-location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition appearance-none cursor-pointer"
                            >
                                <option value="">All Locations</option>
                                {(locations || []).map(loc => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name} ({loc.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label htmlFor="search-date" className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                            Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            <input
                                id="search-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition [color-scheme:light]"
                            />
                        </div>
                    </div>

                    {/* Attendees */}
                    <div>
                        <label htmlFor="search-attendees" className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                            People
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            <input
                                id="search-attendees"
                                type="number"
                                value={attendees}
                                onChange={(e) => setAttendees(e.target.value)}
                                placeholder="e.g. 10"
                                min="1"
                                max="200"
                                className="w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition"
                            />
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <div className="mt-5 flex justify-center">
                    <button
                        type="submit"
                        className="group flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-mimos-500/25 hover:shadow-mimos-500/40 transition-all duration-300 cursor-pointer"
                    >
                        <Search className="w-4.5 h-4.5" />
                        Search Available Rooms
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </form>
    );
}
