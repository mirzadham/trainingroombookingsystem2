import React from 'react';
import SearchBar from '../components/SearchBar';

export default function Home() {
    return (
        <div className="home-shell relative font-sans flex flex-col justify-center overflow-y-auto">
            {/* Hero Section */}
            <section className="relative py-6 lg:py-10">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Badge */}
                    <div className="flex justify-center mb-6">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-mimos-500/5 border border-mimos-500/20 text-mimos-500 text-sm font-semibold tracking-wide backdrop-blur-md shadow-sm hover:scale-[1.02] transition-transform duration-300">
                            Training Room Booking for MIMOS Academy
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-4">
                            <span className="text-slate-900">
                                Find Your Perfect
                            </span>
                            <br />
                            <span className="text-mimos-600 drop-shadow-sm pb-2 inline-block">
                                Training Room
                            </span>
                        </h1>
                        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
                            Book training rooms across TPM and KHTP locations instantly.
                            Smart availability engine finds the perfect match for your session.
                        </p>
                    </div>

                    {/* Smart Search Bar */}
                    <div className="max-w-4xl mx-auto transition-transform duration-300 hover:scale-[1.01] relative z-20">
                        <SearchBar />
                    </div>
                </div>
            </section>
        </div>
    );
}
