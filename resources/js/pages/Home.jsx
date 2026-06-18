import React from 'react';
import { Sparkles } from 'lucide-react';
import SearchBar from '../components/SearchBar';

export default function Home() {
    return (
        <div className="relative font-sans min-h-[calc(100vh-80px)] flex flex-col justify-center">
            {/* Hero Section */}
            <section className="relative py-16 lg:py-24">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-mimos-500/5 border border-mimos-500/20 text-mimos-500 text-sm font-semibold tracking-wide backdrop-blur-md shadow-sm hover:scale-[1.02] transition-transform duration-300">
                            Training Room Booking for MIMOS Academy
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-14">
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
                            <span className="text-slate-900">
                                Find Your Perfect
                            </span>
                            <br />
                            <span className="text-mimos-600 drop-shadow-sm pb-2 inline-block">
                                Training Room
                            </span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
                            Book training rooms across TPM and KHTP locations instantly.
                            Smart availability engine finds the perfect match for your session.
                        </p>
                    </div>

                    {/* Smart Search Bar */}
                    <div className="max-w-4xl mx-auto transition-transform duration-300 hover:scale-[1.01] relative z-20">
                        <SearchBar />
                    </div>

                    {/* Stats */}
                    <div className="max-w-3xl mx-auto mt-20 p-6 bg-white/40 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl shadow-slate-100/50 grid grid-cols-3 gap-4 sm:gap-8 text-center relative z-10">
                        <div className="group">
                            <div className="text-3xl sm:text-4xl font-extrabold text-mimos-600 group-hover:scale-110 transition-transform duration-300 inline-block">2</div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">Locations</div>
                        </div>
                        <div className="group border-x border-slate-200/50">
                            <div className="text-3xl sm:text-4xl font-extrabold text-mimos-600 group-hover:scale-110 transition-transform duration-300 inline-block">8+</div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">Training Rooms</div>
                        </div>
                        <div className="group">
                            <div className="text-3xl sm:text-4xl font-extrabold text-mimos-600 group-hover:scale-110 transition-transform duration-300 inline-block">24/7</div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">Online Booking</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
