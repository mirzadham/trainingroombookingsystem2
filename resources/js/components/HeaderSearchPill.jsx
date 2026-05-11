import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import * as api from '../services/api';

export default function HeaderSearchPill({
    initialLocation = '',
    initialDate = '',
    initialAttendees = '',
    onSearch,
}) {
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
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-1 sm:gap-2 pl-3 pr-2 py-2 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            {/* Location */}
            <div className="relative">
                <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    aria-label="Location"
                    className="appearance-none bg-transparent border-0 focus:ring-0 text-slate-900 text-sm py-1.5 pr-6 cursor-pointer hover:text-mimos-600 transition-colors"
                >
                    <option value="" className="text-slate-500">All Locations</option>
                    {(locations || []).map(loc => (
                        <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                        </option>
                    ))}
                </select>
                <MapPin className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Vertical divider */}
            <div className="w-px h-5 bg-slate-200" />

            {/* Date */}
            <div className="relative">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    aria-label="Date"
                    className="appearance-none bg-transparent border-0 focus:ring-0 text-slate-900 text-sm py-1.5 w-28 sm:w-32 pr-8 [color-scheme:light] hover:text-mimos-600 transition-colors"
                />
                <Calendar className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Vertical divider */}
            <div className="w-px h-5 bg-slate-200" />

            {/* Attendees */}
            <div className="relative">
                <input
                    type="number"
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    placeholder="People"
                    min="1"
                    max="200"
                    aria-label="Attendees"
                    className="appearance-none bg-transparent border-0 focus:ring-0 text-slate-900 text-sm py-1.5 w-20 sm:w-24 pr-8 placeholder:text-slate-400 hover:text-mimos-600 transition-colors"
                />
                <Users className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Button */}
            <button
                type="submit"
                className="ml-1 flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-mimos-500 to-pink-600 text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
            >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
            </button>
        </form>
    );
}
