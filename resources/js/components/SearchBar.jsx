import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Users, ArrowRight } from 'lucide-react';
import * as api from '../services/api';
import DatePicker from './ui/DatePicker';
import LocationPicker from './ui/LocationPicker';

export default function SearchBar({
    initialLocation = '',
    initialDate = '',
    initialEndDate = '',
    initialAttendees = '',
    onSearch,
    className = '',
    variant = 'default',
}) {
    const navigate = useNavigate();
    const [location, setLocation] = useState(initialLocation);
    const [date, setDate] = useState(initialDate);
    const [endDate, setEndDate] = useState(initialEndDate);
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
            end_date: endDate || undefined,
            attendees: attendees || undefined,
        };

        if (onSearch) {
            onSearch(filters);
        } else {
            const params = new URLSearchParams();
            if (filters.location_id) params.set('location_id', filters.location_id);
            params.set('date', filters.date);
            if (filters.end_date) params.set('end_date', filters.end_date);
            if (filters.attendees) params.set('attendees', filters.attendees);
            navigate(`/search?${params.toString()}`);
        }
    };

    // Minimal variant for header integration
    if (variant === 'minimal') {
        return (
            <form onSubmit={handleSubmit} className={className}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 relative z-20">
                    {/* Location */}
                    <div className="relative z-30">
                        <label htmlFor="search-location-min" className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                            Location
                        </label>
                        <LocationPicker
                            id="search-location-min"
                            value={location}
                            onChange={setLocation}
                            locations={locations}
                        />
                    </div>

                    {/* Date */}
                    <div className="relative z-20">
                        <label htmlFor="search-date-min" className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                            Date
                        </label>
                        <DatePicker
                            id="search-date-min"
                            value={date}
                            endDate={endDate}
                            onChange={(startDate, endDateVal) => {
                                setDate(startDate);
                                setEndDate(endDateVal);
                            }}
                            mode="range"
                            showModeToggle={true}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* Attendees */}
                    <div className="relative z-10">
                        <label htmlFor="search-attendees-min" className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                            People
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                id="search-attendees-min"
                                type="number"
                                value={attendees}
                                onChange={(e) => setAttendees(e.target.value)}
                                placeholder="e.g. 10"
                                min="1"
                                max="200"
                                className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/20 focus:border-mimos-500 transition-all duration-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <div className="mt-3 flex justify-end">
                    <button
                        type="submit"
                        className="group flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-md shadow-mimos-500/10 hover:shadow-mimos-500/20 transition-all duration-300 cursor-pointer"
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
            <div className="bg-white/85 backdrop-blur-3xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-mimos-500/5 hover:shadow-xl hover:shadow-mimos-500/10 transition-all duration-300 hover:border-mimos-500/25 relative">
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
                    {/* Location */}
                    <div className="relative z-30">
                        <label htmlFor="search-location" className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            Location
                        </label>
                        <LocationPicker
                            id="search-location"
                            value={location}
                            onChange={setLocation}
                            locations={locations}
                            className="py-3.5 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-mimos-500/20 focus:border-mimos-500 hover:border-slate-300 transition-colors"
                        />
                    </div>

                    {/* Date */}
                    <div className="relative z-20">
                        <label htmlFor="search-date" className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            Date
                        </label>
                        <DatePicker
                            id="search-date"
                            value={date}
                            endDate={endDate}
                            onChange={(startDate, endDateVal) => {
                                setDate(startDate);
                                setEndDate(endDateVal);
                            }}
                            mode="range"
                            showModeToggle={true}
                            min={new Date().toISOString().split('T')[0]}
                            className="py-3.5 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-mimos-500/20 focus:border-mimos-500 hover:border-slate-300 transition-colors"
                        />
                    </div>

                    {/* Attendees */}
                    <div className="relative z-10">
                        <label htmlFor="search-attendees" className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            People
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                            <input
                                id="search-attendees"
                                type="number"
                                value={attendees}
                                onChange={(e) => setAttendees(e.target.value)}
                                placeholder="e.g. 10"
                                min="1"
                                max="200"
                                className="w-full pl-11 pr-8 py-3.5 bg-white border border-slate-200/80 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/20 focus:border-mimos-500 hover:border-slate-300 transition-all duration-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <div className="mt-8 flex justify-center">
                    <button
                        type="submit"
                        className="group flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-mimos-500 to-pink-600 hover:from-mimos-600 hover:to-pink-700 hover:scale-[1.02] active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-mimos-500/20 hover:shadow-mimos-500/35 transition-all duration-300 cursor-pointer"
                    >
                        <Search className="w-5 h-5" />
                        <span>Search Available Rooms</span>
                        <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </form>
    );
}
