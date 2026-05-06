import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Calendar, Users, ArrowRight, Sparkles } from 'lucide-react';
import * as api from '../services/api';

export default function Home() {
    const navigate = useNavigate();
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [attendees, setAttendees] = useState('');

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: api.getLocations,
    });

    const handleSearch = (e) => {
        e.preventDefault();
        if (!date) return;
        const params = new URLSearchParams();
        if (location) params.set('location_id', location);
        params.set('date', date);
        if (attendees) params.set('attendees', attendees);
        navigate(`/search?${params.toString()}`);
    };

    return (
        <div className="relative">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Ambient background effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-mimos-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mimos-600/5 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mimos-500/10 border border-mimos-500/20 text-mimos-400 text-sm font-medium">
                            <Sparkles className="w-4 h-4" />
                            Smart Room Booking for MIMOS Academy
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
                                Find Your Perfect
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-mimos-400 via-mimos-500 to-pink-500 bg-clip-text text-transparent">
                                Training Room
                            </span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Book training rooms across TPM and KHTP locations instantly.
                            Smart search finds available rooms that match your exact needs.
                        </p>
                    </div>

                    {/* Smart Search Bar */}
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSearch} className="relative">
                            <div className="bg-white/80 backdrop-blur-2xl border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Location */}
                                    <div className="relative">
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <select
                                                id="search-location"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-white">All Locations</option>
                                {(locations || []).map(loc => (
                                    <option key={loc.id} value={loc.id} className="bg-white">{loc.name} ({loc.code})</option>
                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                id="search-date"
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition [color-scheme:light]"
                                            />
                                        </div>
                                    </div>

                                    {/* Attendees */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">People</label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                id="search-attendees"
                                                type="number"
                                                value={attendees}
                                                onChange={(e) => setAttendees(e.target.value)}
                                                placeholder="e.g. 10"
                                                min="1"
                                                max="200"
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Search Button */}
                                <div className="mt-5 flex justify-center">
                                    <button
                                        id="search-button"
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
                    </div>

                    {/* Stats */}
                    <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-slate-900">2</div>
                            <div className="text-sm text-slate-500 mt-1">Locations</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">8+</div>
                            <div className="text-sm text-slate-500 mt-1">Training Rooms</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">24/7</div>
                            <div className="text-sm text-slate-500 mt-1">Online Booking</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
