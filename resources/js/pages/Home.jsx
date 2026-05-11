import React from 'react';
import { Sparkles } from 'lucide-react';
import SearchBar from '../components/SearchBar';

export default function Home() {
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
                        <SearchBar />
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
