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
    isAfter,
    startOfDay
} from 'date-fns';

export default function DatePicker({
    id,
    value,      // start date string 'YYYY-MM-DD'
    endDate,    // end date string 'YYYY-MM-DD' (only used in mode="range")
    onChange,   // single: (val) => {}, range: (start, end) => {}
    mode = 'single', // 'single' or 'range'
    min,
    className = '',
    placeholder = 'Select date',
    variant = 'default',
    showModeToggle = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
    const [hoveredDate, setHoveredDate] = useState(null);
    const containerRef = useRef(null);

    // Initialize activeMode: if showModeToggle is true, use 'range' if endDate is present, otherwise 'single'
    const [activeMode, setActiveMode] = useState(() => {
        if (showModeToggle) {
            return endDate ? 'range' : 'single';
        }
        return mode;
    });

    // Keep activeMode in sync with props
    useEffect(() => {
        if (!showModeToggle) {
            setActiveMode(mode);
        }
    }, [mode, showModeToggle]);

    // When the calendar popover opens, set activeMode appropriately based on whether there is an existing end date
    useEffect(() => {
        if (isOpen && showModeToggle) {
            setActiveMode(endDate ? 'range' : 'single');
        }
    }, [isOpen, showModeToggle]);

    // Selected date objects
    const selectedStartDate = value ? parseISO(value) : null;
    const selectedEndDate = endDate ? parseISO(endDate) : null;
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

    const handleModeChange = (newMode) => {
        if (newMode === activeMode) return;
        setActiveMode(newMode);
        
        // Reset and clear end date when switching modes
        onChange(value || '', '');
        setHoveredDate(null);
    };

    const handleDateSelect = (day) => {
        if (isBefore(day, minDate)) return;
        
        const dayStr = format(day, 'yyyy-MM-dd');
        
        if (activeMode === 'range') {
            if (!value || (value && endDate)) {
                // First click: select start date, clear end date
                onChange(dayStr, '');
                setHoveredDate(null);
            } else {
                // Second click: select end date
                const startObj = parseISO(value);
                if (isBefore(day, startObj)) {
                    // If user selects a date before start date, treat it as the new start date
                    onChange(dayStr, '');
                } else {
                    onChange(value, dayStr);
                    setIsOpen(false); // Close calendar on completion
                }
            }
        } else {
            onChange(dayStr, '');
            setIsOpen(false);
        }
    };

    const handleDateMouseEnter = (day) => {
        if (activeMode === 'range' && value && !endDate) {
            if (!isBefore(day, parseISO(value))) {
                setHoveredDate(day);
            } else {
                setHoveredDate(null);
            }
        }
    };

    // Calendar grid generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDateBoundary = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDateBoundary });

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const baseInputClasses = variant === 'pill'
        ? `appearance-none bg-transparent border-0 focus:ring-0 text-slate-900 text-sm py-1.5 ${activeMode === 'range' ? 'w-44 sm:w-52' : 'w-28 sm:w-32'} pl-8 pr-2 cursor-pointer hover:text-mimos-600 transition-colors`
        : "w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-mimos-500/50 focus:border-mimos-500/50 transition cursor-pointer";

    const baseIconClasses = variant === 'pill'
        ? "absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10"
        : "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10";

    const getDisplayValue = () => {
        if (!value) return '';
        const startFormatted = format(parseISO(value), 'MMM d');
        if (activeMode === 'range') {
            if (endDate) {
                const endYearStr = format(parseISO(endDate), 'yyyy');
                const startYearStr = format(parseISO(value), 'yyyy');
                const showYear = startYearStr !== endYearStr ? ', yyyy' : '';
                return `${format(parseISO(value), `MMM d${showYear}`)} - ${format(parseISO(endDate), 'MMM d, yyyy')}`;
            } else {
                return `${format(parseISO(value), 'MMM d, yyyy')} - Select end`;
            }
        }
        return format(parseISO(value), 'MMM d, yyyy');
    };

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
                    value={getDisplayValue()}
                    placeholder={placeholder}
                    className={baseInputClasses}
                    style={className.includes('py-3') ? { paddingTop: '0.75rem', paddingBottom: '0.75rem', borderRadius: '0.75rem' } : {}}
                />
            </div>

            {/* Calendar Popover */}
            {isOpen && (
                <div className="absolute z-[100] mt-2 top-full left-0 bg-white rounded-xl shadow-2xl shadow-slate-400/50 border border-slate-100 p-4 w-[320px] origin-top animate-in fade-in zoom-in-95 duration-200">
                    {/* Premium Sliding Pill Mode Toggle */}
                    {showModeToggle && (
                        <div className="relative bg-slate-100/80 p-0.5 flex rounded-full mb-4 border border-slate-200/20 text-xs font-semibold text-slate-500 relative select-none">
                            {/* Sliding segment background */}
                            <div 
                                className="absolute top-0.5 bottom-0.5 rounded-full bg-white shadow-sm border border-slate-100/50 transition-all duration-300 ease-out"
                                style={{
                                    left: activeMode === 'single' ? '2px' : '50%',
                                    right: activeMode === 'single' ? '50%' : '2px',
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleModeChange('single');
                                }}
                                className={`relative z-10 w-1/2 text-center py-1.5 transition-colors duration-200 rounded-full cursor-pointer font-semibold ${
                                    activeMode === 'single' ? 'text-mimos-700 font-bold' : 'text-slate-500 hover:text-slate-850'
                                }`}
                            >
                                Single Day
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleModeChange('range');
                                }}
                                className={`relative z-10 w-1/2 text-center py-1.5 transition-colors duration-200 rounded-full cursor-pointer font-semibold ${
                                    activeMode === 'range' ? 'text-mimos-700 font-bold' : 'text-slate-500 hover:text-slate-850'
                                }`}
                            >
                                Consecutive Days
                            </button>
                        </div>
                    )}

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
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isTodayDate = isToday(day);
                            const isDisabled = isBefore(day, minDate);

                            // Date Range specific styles
                            const isStart = selectedStartDate && isSameDay(day, selectedStartDate);
                            const isEnd = selectedEndDate && isSameDay(day, selectedEndDate);
                            
                            const isInRange = selectedStartDate && selectedEndDate && 
                                isAfter(day, selectedStartDate) && isBefore(day, selectedEndDate);
                                
                            const isInHoverRange = activeMode === 'range' && selectedStartDate && !selectedEndDate && hoveredDate && 
                                isAfter(day, selectedStartDate) && (isSameDay(day, hoveredDate) || isBefore(day, hoveredDate));

                            let dayBgClass = 'rounded-full hover:bg-slate-100';
                            let textClass = !isCurrentMonth ? 'text-slate-300' : 'text-slate-700';

                            if (isStart) {
                                if (activeMode === 'range' && (selectedEndDate || hoveredDate)) {
                                    dayBgClass = 'bg-mimos-500 text-white rounded-l-full rounded-r-none shadow-md shadow-mimos-500/20';
                                } else {
                                    dayBgClass = 'bg-mimos-500 text-white rounded-full shadow-md shadow-mimos-500/20';
                                }
                                textClass = 'text-white font-semibold';
                            } else if (isEnd) {
                                dayBgClass = 'bg-mimos-500 text-white rounded-r-full rounded-l-none shadow-md shadow-mimos-500/20';
                                textClass = 'text-white font-semibold';
                            } else if (isInRange || isInHoverRange) {
                                dayBgClass = 'bg-mimos-50/80 rounded-none text-mimos-700 font-medium hover:bg-mimos-100/50';
                                textClass = 'text-mimos-700';
                            } else if (isTodayDate && !isStart && !isEnd) {
                                dayBgClass = 'border border-mimos-200 text-mimos-600 font-medium rounded-full';
                                textClass = 'text-mimos-600';
                            }

                            if (isDisabled) {
                                dayBgClass = 'opacity-30 cursor-not-allowed';
                                textClass = 'text-slate-400';
                            }

                            return (
                                <div key={day.toString()} className="flex justify-center p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => handleDateSelect(day)}
                                        onMouseEnter={() => handleDateMouseEnter(day)}
                                        disabled={isDisabled}
                                        className={`w-8 h-8 flex items-center justify-center text-xs transition-all duration-150 ${dayBgClass} ${textClass}`}
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
