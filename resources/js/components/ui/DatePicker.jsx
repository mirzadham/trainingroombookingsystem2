import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    isToday,
    parseISO,
    isBefore,
    startOfDay
} from 'date-fns';

export default function DatePicker({
    id,
    value,
    onChange,
    min,
    className = '',
    placeholder = 'Select date',
    variant = 'default'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
    const containerRef = useRef(null);

    // Selected date as Date object
    const selectedDate = value ? parseISO(value) : null;
    const minDate = min ? parseISO(min) : startOfDay(new Date());

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

    const handlePreviousMonth = (e) => {
        e.stopPropagation();
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = (e) => {
        e.stopPropagation();
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const handleDateSelect = (day) => {
        if (isBefore(day, minDate)) return;
        
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    // Calendar grid generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const baseInputClasses = variant === 'pill'
        ? "appearance-none bg-transparent border-0 focus:ring-0 text-slate-900 text-sm py-1.5 w-28 sm:w-32 pl-8 pr-2 cursor-pointer hover:text-mimos-600 transition-colors"
        : "w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition cursor-pointer";

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
                <CalendarIcon className={baseIconClasses} />
                <input
                    id={id}
                    type="text"
                    readOnly
                    value={value ? format(parseISO(value), 'MMM d, yyyy') : ''}
                    placeholder={placeholder}
                    className={baseInputClasses}
                    style={className.includes('py-3') ? { paddingTop: '0.75rem', paddingBottom: '0.75rem', borderRadius: '0.75rem' } : {}}
                />
            </div>

            {/* Calendar Popover */}
            {isOpen && (
                <div className="absolute z-[100] mt-2 top-full left-0 bg-white rounded-xl shadow-2xl shadow-slate-400/50 border border-slate-100 p-4 w-[320px] origin-top animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <button
                            type="button"
                            onClick={handlePreviousMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-sm font-semibold text-slate-900">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Days of Week */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-y-1">
                        {days.map((day, idx) => {
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isTodayDate = isToday(day);
                            const isDisabled = isBefore(day, minDate);

                            return (
                                <div key={day.toString()} className="flex justify-center p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => handleDateSelect(day)}
                                        disabled={isDisabled}
                                        className={`
                                            w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all
                                            ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                            ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}
                                            ${isTodayDate && !isSelected ? 'border border-mimos-200 text-mimos-600 font-medium' : ''}
                                            ${isSelected ? 'bg-mimos-500 text-white font-semibold hover:bg-mimos-600 shadow-md shadow-mimos-500/30' : ''}
                                        `}
                                    >
                                        {format(day, dateFormat)}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
