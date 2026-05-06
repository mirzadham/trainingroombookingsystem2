import React, { useMemo } from 'react';
import { Users, Monitor, Wifi } from 'lucide-react';

const AMENITY_ICONS = {
    projector: Monitor,
    video_conferencing: Wifi,
};

/**
 * TimelineGrid — Rooms as rows, 30-min time slots as columns.
 * Color-coded: green (available), red (occupied), yellow (near-miss).
 *
 * Props:
 *   gridData: { date, time_slots, grid }
 *   searchStart: start time string from search
 *   searchEnd: end time string from search
 *   onSlotSelect: (roomId, start, end) => void
 */
export default function TimelineGrid({ gridData, searchStart, searchEnd, onSlotSelect }) {
    if (!gridData || !gridData.grid?.length) {
        return null;
    }

    const { time_slots, grid } = gridData;

    // Determine which slots fall within the search range for highlighting
    const searchRange = useMemo(() => {
        if (!searchStart || !searchEnd) return null;
        return { start: searchStart, end: searchEnd };
    }, [searchStart, searchEnd]);

    return (
        <div className="w-full overflow-x-auto">
            <div className="min-w-[900px]">
                {/* Header: time labels */}
                <div className="flex">
                    {/* Room name column */}
                    <div className="w-52 flex-shrink-0 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        Room
                    </div>
                    {/* Time slot columns */}
                    <div className="flex-1 flex">
                        {time_slots.map((label, i) => (
                            <div
                                key={i}
                                className="flex-1 min-w-[48px] p-1.5 text-center text-[10px] text-slate-500 border-b border-slate-200 border-l border-slate-200"
                            >
                                {i % 2 === 0 ? label : ''}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rows: rooms */}
                {grid.map((row) => (
                    <TimelineRow
                        key={row.room.id}
                        room={row.room}
                        slots={row.slots}
                        searchRange={searchRange}
                        onSlotSelect={onSlotSelect}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 px-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
                    Available
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
                    Occupied
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-mimos-500/20 border border-mimos-500/40" />
                    Your Selection
                </div>
            </div>
        </div>
    );
}

function TimelineRow({ room, slots, searchRange, onSlotSelect }) {
    // Track drag selection state
    const [selecting, setSelecting] = React.useState(false);
    const [selStart, setSelStart] = React.useState(null);
    const [selEnd, setSelEnd] = React.useState(null);

    const handleSlotClick = (slot, index) => {
        if (slot.status === 'occupied') return;

        if (!selecting) {
            setSelecting(true);
            setSelStart(index);
            setSelEnd(index);
        } else {
            setSelecting(false);
            const start = Math.min(selStart, index);
            const end = Math.max(selStart, index);
            const startSlot = slots[start];
            const endSlot = slots[end];

            // Check if any occupied slot is in the range
            const hasConflict = slots.slice(start, end + 1).some(s => s.status === 'occupied');
            if (hasConflict) {
                setSelStart(null);
                setSelEnd(null);
                return;
            }

            if (onSlotSelect) {
                onSlotSelect(room.id, startSlot.start, endSlot.end, room);
            }
            setSelStart(null);
            setSelEnd(null);
        }
    };

    const handleSlotHover = (index) => {
        if (selecting) {
            setSelEnd(index);
        }
    };

    const getSelectionRange = () => {
        if (selStart === null) return null;
        const end = selEnd ?? selStart;
        return { start: Math.min(selStart, end), end: Math.max(selStart, end) };
    };

    const selRange = getSelectionRange();

    return (
        <div className="flex group hover:bg-slate-50 transition-colors">
            {/* Room info */}
            <div className="w-52 flex-shrink-0 p-3 border-b border-slate-200">
                <div className="text-sm font-medium text-slate-900">{room.name}</div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        {room.capacity}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {room.location_code}
                    </span>
                </div>
            </div>

            {/* Slots */}
            <div className="flex-1 flex">
                {slots.map((slot, i) => {
                    const isOccupied = slot.status === 'occupied';
                    const isInSelection = selRange && i >= selRange.start && i <= selRange.end;
                    const isSelectionBlocked = isInSelection && isOccupied;

                    let bgClass = 'bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer';
                    if (isOccupied) {
                        bgClass = 'bg-red-500/15 cursor-not-allowed';
                    }
                    if (isInSelection && !isSelectionBlocked) {
                        bgClass = 'bg-mimos-500/25 ring-1 ring-inset ring-mimos-500/40';
                    }
                    if (isSelectionBlocked) {
                        bgClass = 'bg-red-500/30 ring-1 ring-inset ring-red-500/50';
                    }

                    return (
                        <div
                            key={i}
                            className={`flex-1 min-w-[48px] h-12 border-b border-l border-slate-200 transition-colors duration-100 ${bgClass}`}
                            onClick={() => handleSlotClick(slot, i)}
                            onMouseEnter={() => handleSlotHover(i)}
                            title={
                                isOccupied
                                    ? `Occupied: ${slot.booking_title || 'Booking'}`
                                    : `Available: ${slot.label}`
                            }
                        >
                            {isOccupied && (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
