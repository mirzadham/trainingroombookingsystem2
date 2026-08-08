<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Room;
use App\Models\RoomBlackout;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AvailabilityService
{
    public function __construct(
        private AvailabilityCacheService $availabilityCache
    ) {}

    /**
     * Check if a specific room is available for the given time range.
     * Only APPROVED bookings block availability.
     */
    public function isAvailable(int $roomId, Carbon $start, Carbon $end, ?int $excludeBookingId = null): bool
    {
        $query = Booking::forRoom($roomId)
            ->approved()
            ->overlapping($start, $end);

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        if ($query->exists()) {
            return false;
        }

        // One-off blackouts: precise SQL overlap check that uses the
        // (room_id, start_time, end_time) index — no occurrence expansion.
        $hasOneOffBlackout = RoomBlackout::where('room_id', $roomId)
            ->where(function ($q) {
                $q->where('recurrence', 'none')->orWhereNull('recurrence');
            })
            ->overlapping($start, $end)
            ->exists();

        if ($hasOneOffBlackout) {
            return false;
        }

        // Recurring blackouts need per-occurrence expansion, done in memory.
        $hasRecurringBlackout = RoomBlackout::where('room_id', $roomId)
            ->where('recurrence', '!=', 'none')
            ->overlapping($start, $end)
            ->get()
            ->contains(fn (RoomBlackout $b) => $b->overlaps($start, $end));

        return ! $hasRecurringBlackout;
    }

    /**
     * Check if a conflict exists for approval purposes.
     * Uses the same logic as isAvailable but semantically different.
     */
    public function hasConflict(int $roomId, Carbon $start, Carbon $end, ?int $excludeBookingId = null): bool
    {
        return ! $this->isAvailable($roomId, $start, $end, $excludeBookingId);
    }

    /**
     * Get available rooms matching search criteria.
     */
    public function getAvailableRooms(
        ?int $locationId,
        Carbon $date,
        Carbon $startTime,
        Carbon $endTime,
        ?int $attendees = null
    ): Collection {
        $query = Room::active()->with('location');

        if ($locationId) {
            $query->where('location_id', $locationId);
        }

        if ($attendees) {
            $query->minCapacity($attendees);
        }

        $rooms = $query->orderBy('capacity')->get();

        // Build the start/end datetimes
        $start = $date->copy()->setTime($startTime->hour, $startTime->minute);
        $end = $date->copy()->setTime($endTime->hour, $endTime->minute);

        // Batch fetch overlapping approved bookings + blackouts for all
        // candidate rooms in two queries (no per-room N+1).
        $occupiedRoomIds = $this->occupiedRoomIds($rooms->pluck('id')->toArray(), $start, $end);

        // Filter rooms that are available for the requested time
        return $rooms->map(function ($room) use ($occupiedRoomIds) {
            $room->is_available = ! in_array($room->id, $occupiedRoomIds, true);

            return $room;
        });
    }

    /**
     * Generate timeline grid data for a location on a specific date.
     * Returns rooms as rows with time slot availability.
     *
     * Cached per (location, date range): any booking / room / blackout /
     * location write bumps the availability cache generation, so cached
     * grids can never go stale while unchanged grids skip the full rebuild.
     */
    public function getTimelineGrid(?int $locationId, Carbon $date, ?Carbon $endDate = null): array
    {
        return $this->availabilityCache->remember(
            'timeline:'.($locationId ?? 'all').':'.$date->toDateString().':'.($endDate?->toDateString() ?? 'single'),
            3600,
            fn () => $this->buildTimelineGrid($locationId, $date, $endDate)
        );
    }

    /**
     * Rebuild the timeline grid from the database.
     */
    private function buildTimelineGrid(?int $locationId, Carbon $date, ?Carbon $endDate = null): array
    {
        $query = Room::active()->with('location');

        if ($locationId) {
            $query->where('location_id', $locationId);
        }

        $rooms = $query->orderBy('name')->get();

        // Generate time slots (configurable intervals)
        $slots = $this->generateTimeSlots($date);

        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');

        // Get all approved bookings for these rooms on this date range
        $dayStart = $date->copy()->setTime($openHour, 0);
        $dayEnd = ($endDate ?? $date)->copy()->setTime($closeHour, 0);

        $bookings = Booking::approved()
            ->whereIn('room_id', $rooms->pluck('id'))
            ->overlapping($dayStart, $dayEnd)
            ->get();

        // Get all overlapping blackouts (incl. recurring patterns) for these rooms in the range
        $blackouts = RoomBlackout::whereIn('room_id', $rooms->pluck('id'))
            ->overlapping($dayStart, $dayEnd)
            ->get();

        // Build grid data
        $grid = [];
        foreach ($rooms as $room) {
            $roomBookings = $bookings->where('room_id', $room->id);
            $roomBlackouts = $blackouts->where('room_id', $room->id);
            $roomSlots = [];

            foreach ($slots as $slot) {
                $slotStart = Carbon::parse($slot['start']);
                $slotEnd = Carbon::parse($slot['end']);

                $timeStartStr = $slotStart->format('H:i:s');
                $timeEndStr = $slotEnd->format('H:i:s');

                // Check if any booking or blackout overlaps this slot on any day of the range
                $isOccupied = false;
                $overlappingBooking = null;
                $overlappingBlackout = null;

                if ($endDate && $endDate->greaterThan($date)) {
                    for ($current = $date->copy(); $current->lte($endDate); $current->addDay()) {
                        // Current day slot in MYT timezone (app timezone)
                        $currentStart = Carbon::createFromTimeString($timeStartStr, 'Asia/Kuala_Lumpur')
                            ->setDate($current->year, $current->month, $current->day);
                        $currentEnd = Carbon::createFromTimeString($timeEndStr, 'Asia/Kuala_Lumpur')
                            ->setDate($current->year, $current->month, $current->day);

                        // Compare directly using local Asia/Kuala_Lumpur times
                        $overlappingBooking = $roomBookings->first(function ($booking) use ($currentStart, $currentEnd) {
                            return $booking->start_time < $currentEnd && $booking->end_time > $currentStart;
                        });

                        $overlappingBlackout = $roomBlackouts->first(function ($bo) use ($currentStart, $currentEnd) {
                            return $bo->overlaps($currentStart, $currentEnd);
                        });

                        if ($overlappingBooking || $overlappingBlackout) {
                            $isOccupied = true;
                            break;
                        }
                    }
                } else {
                    // Single day check (already local times)
                    $overlappingBooking = $roomBookings->first(function ($booking) use ($slotStart, $slotEnd) {
                        return $booking->start_time < $slotEnd && $booking->end_time > $slotStart;
                    });

                    $overlappingBlackout = $roomBlackouts->first(function ($bo) use ($slotStart, $slotEnd) {
                        return $bo->overlaps($slotStart, $slotEnd);
                    });

                    $isOccupied = (bool) ($overlappingBooking || $overlappingBlackout);
                }

                $status = 'available';
                $bookingId = null;
                $bookingTitle = null;

                if ($overlappingBlackout) {
                    $status = 'occupied';
                    $bookingTitle = 'Maintenance / Blackout: '.$overlappingBlackout->title;
                } elseif ($overlappingBooking) {
                    $status = 'occupied';
                    $bookingId = $overlappingBooking->id;
                    $bookingTitle = $overlappingBooking->title;
                }

                $roomSlots[] = [
                    'start' => $slot['start'],
                    'end' => $slot['end'],
                    'label' => $slot['label'],
                    'status' => $status,
                    'booking_id' => $bookingId,
                    'booking_title' => $bookingTitle,
                ];
            }

            $grid[] = [
                'room' => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'capacity' => $room->capacity,
                    'location' => $room->location->name,
                    'location_code' => $room->location->code,
                    'location_legend' => $room->location_legend,
                    'amenities' => $room->amenities ?? [],
                    'image_url' => $room->image_url,
                    'images' => $room->images,
                    'description' => $room->description,
                ],
                'slots' => $roomSlots,
            ];
        }

        return [
            'date' => $date->toDateString(),
            'end_date' => $endDate ? $endDate->toDateString() : null,
            'time_slots' => array_map(fn ($s) => $s['label'], $slots),
            'grid' => $grid,
        ];
    }

    /**
     * Get fallback suggestions when no exact match is found.
     * Suggests nearby time slots and alternative rooms.
     */
    public function getFallbackSuggestions(
        ?int $locationId,
        Carbon $date,
        Carbon $startTime,
        Carbon $endTime,
        ?int $attendees = null
    ): array {
        $suggestions = [];
        $duration = $startTime->diffInMinutes($endTime);

        // Strategy 1: Try nearby time slots (±1 hour) in the same rooms
        $nearbySlots = $this->findNearbySlots($locationId, $date, $startTime, $endTime, $attendees, $duration);
        if ($nearbySlots->isNotEmpty()) {
            $suggestions['nearby_times'] = $nearbySlots->take(5)->values()->toArray();
        }

        // Strategy 2: Try alternative rooms at the same time (different location or smaller/larger)
        $altRooms = $this->findAlternativeRooms($locationId, $date, $startTime, $endTime, $attendees);
        if ($altRooms->isNotEmpty()) {
            $suggestions['alternative_rooms'] = $altRooms->take(5)->values()->toArray();
        }

        return $suggestions;
    }

    /**
     * Generate time slots for a given date based on configured duration.
     */
    private function generateTimeSlots(Carbon $date): array
    {
        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');
        $slotMinutes = config('booking.slot_duration_minutes');

        $slots = [];
        $current = $date->copy()->setTime($openHour, 0);
        $end = $date->copy()->setTime($closeHour, 0);

        while ($current < $end) {
            $slotEnd = $current->copy()->addMinutes($slotMinutes);
            $slots[] = [
                'start' => $current->toDateTimeString(),
                'end' => $slotEnd->toDateTimeString(),
                'label' => $current->format('g:i A'),
            ];
            $current = $slotEnd;
        }

        return $slots;
    }

    /**
     * Room IDs occupied for a given range: overlapping approved bookings
     * plus overlapping blackouts (incl. recurring patterns).
     *
     * Always two batched queries — never one per room.
     */
    private function occupiedRoomIds(array $roomIds, Carbon $start, Carbon $end): array
    {
        if ($roomIds === []) {
            return [];
        }

        $bookingRoomIds = Booking::approved()
            ->whereIn('room_id', $roomIds)
            ->overlapping($start, $end)
            ->pluck('room_id')
            ->toArray();

        $blackoutRoomIds = RoomBlackout::whereIn('room_id', $roomIds)
            ->overlapping($start, $end)
            ->get()
            ->filter(fn (RoomBlackout $b) => $b->overlaps($start, $end))
            ->pluck('room_id')
            ->toArray();

        // Normalize to ints: some drivers/PDO configs return integer columns
        // as strings, which would silently break the strict in_array()
        // checks in getAvailableRooms()/findAlternativeRooms() and mark
        // occupied rooms as available.
        $ids = array_map('intval', array_merge($bookingRoomIds, $blackoutRoomIds));

        return array_values(array_unique($ids));
    }

    /**
     * Find nearby available time slots (shift by slot-duration increments, ±2 hours).
     */
    private function findNearbySlots(
        ?int $locationId,
        Carbon $date,
        Carbon $startTime,
        Carbon $endTime,
        ?int $attendees,
        int $durationMinutes
    ): Collection {
        $suggestions = collect();
        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');

        $query = Room::active();
        if ($locationId) {
            $query->where('location_id', $locationId);
        }
        if ($attendees) {
            $query->minCapacity($attendees);
        }
        $rooms = $query->with('location')->get();

        if ($rooms->isEmpty()) {
            return $suggestions;
        }

        // Try shifting by 30-min increments, up to ±2 hours
        $shifts = [-30, 30, -60, 60, -90, 90, -120, 120];
        $windows = [];

        foreach ($shifts as $shiftMinutes) {
            $newStart = $date->copy()->setTime($startTime->hour, $startTime->minute)->addMinutes($shiftMinutes);
            $newEnd = $newStart->copy()->addMinutes($durationMinutes);

            // Skip if outside operating hours
            if ($newStart->hour < $openHour || $newEnd->hour > $closeHour) {
                continue;
            }
            if ($newEnd->hour === $closeHour && $newEnd->minute > 0) {
                continue;
            }

            $windows[] = ['start' => $newStart, 'end' => $newEnd];
        }

        if ($windows === []) {
            return $suggestions;
        }

        // One batch fetch spanning every candidate window instead of one
        // isAvailable() (2 queries) per room per shift.
        $spanStart = $windows[0]['start'];
        $spanEnd = $windows[0]['end'];
        foreach ($windows as $window) {
            if ($window['start']->lt($spanStart)) {
                $spanStart = $window['start'];
            }
            if ($window['end']->gt($spanEnd)) {
                $spanEnd = $window['end'];
            }
        }

        $bookings = Booking::approved()
            ->whereIn('room_id', $rooms->pluck('id'))
            ->overlapping($spanStart, $spanEnd)
            ->get();

        $blackouts = RoomBlackout::whereIn('room_id', $rooms->pluck('id'))
            ->overlapping($spanStart, $spanEnd)
            ->get();

        foreach ($windows as $window) {
            $occupiedRoomIds = $bookings
                ->filter(fn (Booking $b) => $b->start_time < $window['end'] && $b->end_time > $window['start'])
                ->pluck('room_id')
                ->merge(
                    $blackouts
                        ->filter(fn (RoomBlackout $b) => $b->overlaps($window['start'], $window['end']))
                        ->pluck('room_id')
                )
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            foreach ($rooms as $room) {
                if ($occupiedRoomIds->contains($room->id)) {
                    continue;
                }

                $suggestions->push([
                    'room' => [
                        'id' => $room->id,
                        'name' => $room->name,
                        'capacity' => $room->capacity,
                        'location' => $room->location->name,
                    ],
                    'start_time' => $window['start']->toDateTimeString(),
                    'end_time' => $window['end']->toDateTimeString(),
                    'type' => 'nearby_time',
                ]);
            }
        }

        return $suggestions;
    }

    /**
     * Find alternative rooms that are available at the requested time.
     */
    private function findAlternativeRooms(
        ?int $locationId,
        Carbon $date,
        Carbon $startTime,
        Carbon $endTime,
        ?int $attendees
    ): Collection {
        $suggestions = collect();

        // Search ALL locations (not just the requested one)
        $query = Room::active()->with('location');
        if ($attendees) {
            // Allow rooms with slightly less capacity (80%)
            $query->where('capacity', '>=', max(1, (int) ($attendees * 0.8)));
        }
        $rooms = $query->get();

        if ($rooms->isEmpty()) {
            return $suggestions;
        }

        $start = $date->copy()->setTime($startTime->hour, $startTime->minute);
        $end = $date->copy()->setTime($endTime->hour, $endTime->minute);

        // Single batched conflict check for every candidate room (previously
        // one isAvailable() — two queries — per room).
        $occupiedRoomIds = $this->occupiedRoomIds($rooms->pluck('id')->toArray(), $start, $end);

        foreach ($rooms as $room) {
            // Skip rooms from the originally requested location (those would be in nearby_times)
            if ($locationId && $room->location_id === $locationId) {
                continue;
            }

            if (! in_array($room->id, $occupiedRoomIds, true)) {
                $suggestions->push([
                    'room' => [
                        'id' => $room->id,
                        'name' => $room->name,
                        'capacity' => $room->capacity,
                        'location' => $room->location->name,
                        'location_code' => $room->location->code,
                    ],
                    'start_time' => $start->toDateTimeString(),
                    'end_time' => $end->toDateTimeString(),
                    'type' => 'alternative_room',
                ]);
            }
        }

        return $suggestions;
    }
}
