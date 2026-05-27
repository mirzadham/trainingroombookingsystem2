import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Building2 } from 'lucide-react';

export default function LocationPicker({
    id,
    value,
    onChange,
    locations,
    className = '',
    variant = 'default'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (id) => {
        onChange(String(id));
        setIsOpen(false);
    };

    // Map content to locations
    const getLocationDetails = (loc) => {
        if (loc.code === 'KHTP') {
            return {
                image: '/images/locations/khtp.png',
                description: 'Kulim Hi-Tech Park.',
            };
        }
        if (loc.code === 'TPM') {
            return {
                image: '/images/locations/tpm.png',
                description: 'Technology Park Malaysia.',
            };
        }
        return {
            image: '/images/MIMOS-Academy.png',
            description: loc.address || 'Premium facility.',
        };
    };

    const selectedLocation = locations?.find(l => String(l.id) === String(value));

    const baseInputClasses = variant === 'pill'
        ? "appearance-none bg-transparent border-0 focus:ring-0 text-slate-900 text-sm py-1.5 w-32 sm:w-40 pl-8 pr-2 cursor-pointer hover:text-mimos-600 transition-colors text-left truncate"
        : "w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition cursor-pointer text-left";

    const baseIconClasses = variant === 'pill'
        ? "absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10"
        : "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10";

    return (
        <div className="relative" ref={containerRef}>
            {/* Input Trigger */}
            <div
                className="relative cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <MapPin className={baseIconClasses} />
                <button
                    type="button"
                    id={id}
                    className={baseInputClasses}
                    style={className.includes('py-3') ? { paddingTop: '0.75rem', paddingBottom: '0.75rem', borderRadius: '0.75rem' } : {}}
                >
                    {selectedLocation ? selectedLocation.name : 'All Locations'}
                </button>
            </div>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute z-[100] mt-2 top-full left-0 bg-white rounded-2xl shadow-2xl shadow-slate-400/50 border border-slate-100 p-3 w-[340px] origin-top animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-2.5">
                    {/* Reset Option */}
                    <button
                        type="button"
                        onClick={() => handleSelect('')}
                        className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-xl transition-colors text-sm font-medium ${!value ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${!value ? 'bg-white shadow-sm text-mimos-600' : 'bg-slate-100 text-slate-500'}`}>
                            <MapPin className="w-4 h-4" />
                        </div>
                        <span className="flex-1">Any Location</span>
                        {!value && (
                            <div className="w-2 h-2 rounded-full bg-mimos-500 shadow-[0_0_8px_rgba(236,72,153,0.8)] mr-1"></div>
                        )}
                    </button>
                    
                    <div className="h-px bg-slate-100 mx-1 my-0.5"></div>

                    {/* Location Cards */}
                    {locations?.map((loc) => {
                        const details = getLocationDetails(loc);
                        const isSelected = String(loc.id) === String(value);
                        
                        return (
                            <button
                                key={loc.id}
                                onClick={() => handleSelect(loc.id)}
                                className={`group relative h-28 w-full rounded-xl overflow-hidden text-left focus:outline-none ring-0 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border ${isSelected ? 'border-mimos-500 ring-2 ring-mimos-500/30' : 'border-transparent shadow-sm hover:shadow-md'}`}
                            >
                                <div className="absolute inset-0">
                                    <img
                                        src={details.image}
                                        alt={loc.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                                {/* Dark Overlay */}
                                <div className="absolute inset-0 bg-slate-900/50 opacity-80 group-hover:opacity-90 transition-opacity" />
                                
                                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                    <h3 className="text-base font-bold text-white mb-0.5 drop-shadow-md">{loc.name}</h3>

                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center text-slate-200 text-xs font-medium">
                                            <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                                            {loc.rooms_count || 12} Rooms
                                        </div>
                                        {isSelected && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-mimos-500 shadow-[0_0_8px_rgba(236,72,153,0.8)] border border-white"></div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
