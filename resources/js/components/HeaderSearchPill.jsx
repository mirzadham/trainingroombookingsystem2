import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Users } from 'lucide-react';
import * as api from '../services/api';
import DatePicker from './ui/DatePicker';
import LocationPicker from './ui/LocationPicker';

export default function HeaderSearchPill({
    initialLocation = '',
    initialDate = '',
    initialEndDate = '',
    initialAttendees = '',
    onSearch,
}) {
    const [location, setLocation] = useState(initialLocation);
    const [date, setDate] = useState(initialDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [attendees, setAttendees] = useState(initialAttendees);
    const [showError, setShowError] = useState(false);
    const errorTimer = useRef(null);

    // Clear the error-hide timer on unmount
    useEffect(() => () => window.clearTimeout(errorTimer.current), []);

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Location and Date are required (parity with SearchBar)
        if (!date || !location) {
            setShowError(true);
            window.clearTimeout(errorTimer.current);
            errorTimer.current = window.setTimeout(() => setShowError(false), 2500);
            return;
        }

        const filters = {
            location_id: location,
            date,
            end_date: endDate || undefined,
            attendees: attendees || undefined,
        };

        if (onSearch) {
            onSearch(filters);
        }
    };

    return (
        <div className="relative">
            <form
                onSubmit={handleSubmit}
                className={`flex items-center gap-1 sm:gap-2 pl-3 pr-2 py-2 rounded-full bg-white border shadow-sm hover:shadow-md transition-shadow ${
                    showError ? 'border-red-400 animate-shake' : 'border-slate-200'
                }`}
            >
                {/* Location */}
                <div className="relative z-30">
                    <LocationPicker
                        id="pill-location"
                        value={location}
                        onChange={setLocation}
                        locations={locations}
                        variant="pill"
                        required
                    />
                </div>

                {/* Vertical divider */}
                <div className="w-px h-5 bg-slate-200" />

                {/* Date */}
                <div className="relative z-20">
                    <DatePicker
                        value={date}
                        endDate={endDate}
                        onChange={(startDate, endDateVal) => {
                            setDate(startDate);
                            setEndDate(endDateVal);
                        }}
                        mode="range"
                        showModeToggle={true}
                        min={new Date().toISOString().split('T')[0]}
                        variant="pill"
                        placeholder="Date"
                        required
                    />
                </div>

                {/* Vertical divider */}
                <div className="w-px h-5 bg-slate-200" />

                {/* Attendees */}
                <div className="relative z-10">
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
                    className="ml-1 flex items-center gap-1.5 px-4 py-2 rounded-full bg-mimos-500 hover:bg-mimos-600 text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
                >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                </button>
            </form>

            {/* Invalid-submit feedback (floating, no layout shift) */}
            {showError && (
                <p
                    role="alert"
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-red-600 bg-white border border-red-200 rounded-lg shadow-lg px-3 py-1.5 font-medium z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                    {!date ? 'Please select a date.' : 'Please select a location.'}
                </p>
            )}
        </div>
    );
}
