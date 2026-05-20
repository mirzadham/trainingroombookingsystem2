import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import SearchBar from './SearchBar';

export default function HeaderSearchModal({
    isOpen,
    onClose,
    initialLocation = '',
    initialDate = '',
    initialAttendees = '',
    onSearch,
}) {
    if (!isOpen) return null;

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSearch = (filters) => {
        if (onSearch) {
            onSearch(filters);
        }
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-20"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Find a Training Room</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                        aria-label="Close search"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                    <SearchBar
                        variant="default"
                        initialLocation={initialLocation}
                        initialDate={initialDate}
                        initialAttendees={initialAttendees}
                        onSearch={handleSearch}
                    />
                </div>
            </div>
        </div>
    );
}
