<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AvailabilityService
{
    // Operating hours
    const OPEN_HOUR = 7;   // 7 AM
    const CLOSE_HOUR = 19; // 7 PM
    const SLOT_DURATION_MINUTES = 30;

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

        return !$query->exists();
    }

    /**
     * Check if a conflict exists for approval purposes.
     * Uses the same logic as isAvailable but semantically different.
     */
    public function hasConflict(int $roomId, Carbon $start, Carbon $end, ?int $excludeBookingId = null): bool
    {
        return !$this->isAvailable($roomId, $start, $end, $excludeBookingId);
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

        // Filter rooms that are available for the requested time
        return $rooms->map(function ($room) use ($start, $end) {
            $room->is_available = $this->isAvailable($room->id, $start, $end);
            return $room;
        });
    }

    /**
     * Generate timeline grid data for a location on a specific date.
     * Returns rooms as rows with time slot availability.
     */
    public function getTimelineGrid(?int $locationId, Carbon $date): array
    {
        $query = Room::active()->with('location');

        if ($locationId) {
            $query->where('location_id', $locationId);
        }

        $rooms = $query->orderBy('name')->get();

        // Generate time slots (30-min intervals from 7AM to 7PM)
        $slots = $this->generateTimeSlots($date);

        // Get all approved bookings for these rooms on this date
        $dayStart = $date->copy()->setTime(self::OPEN_HOUR, 0);
        $dayEnd = $date->copy()->setTime(self::CLOSE_HOUR, 0);

        $bookings = Booking::approved()
            ->whereIn('room_id', $rooms->pluck('id'))
            ->overlapping($dayStart, $dayEnd)
            ->get();

        // Build grid data
        $grid = [];
        foreach ($rooms as $room) {
            $roomBookings = $bookings->where('room_id', $room->id);
            $roomSlots = [];

            foreach ($slots as $slot) {
                $slotStart = Carbon::parse($slot['start']);
                $slotEnd = Carbon::parse($slot['end']);

                // Check if any booking overlaps this slot
                $overlappingBooking = $roomBookings->first(function ($booking) use ($slotStart, $slotEnd) {
                    return $booking->start_time < $slotEnd && $booking->end_time > $slotStart;
                });

                $roomSlots[] = [
                    'start' => $slot['start'],
                    'end' => $slot['end'],
                    'label' => $slot['label'],
                    'status' => $overlappingBooking ? 'occupied' : 'available',
                    'booking_id' => $overlappingBooking?->id,
                    'booking_title' => $overlappingBooking?->title,
                ];
            }

            $grid[] = [
                'room' => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'capacity' => $room->capacity,
                    'location' => $room->location->name,
                    'location_code' => $room->location->code,
                    'amenities' => $room->amenities ?? [],
                ],
                'slots' => $roomSlots,
            ];
        }

        return [
            'date' => $date->toDateString(),
            'time_slots' => array_map(fn($s) => $s['label'], $slots),
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
     * Generate 30-minute time slots for a given date.
     */
    private function generateTimeSlots(Carbon $date): array
    {
        $slots = [];
        $current = $date->copy()->setTime(self::OPEN_HOUR, 0);
        $end = $date->copy()->setTime(self::CLOSE_HOUR, 0);

        while ($current < $end) {
            $slotEnd = $current->copy()->addMinutes(self::SLOT_DURATION_MINUTES);
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
     * Find nearby available time slots (shift by 30-min increments, ±2 hours).
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

        $query = Room::active();
        if ($locationId) $query->where('location_id', $locationId);
        if ($attendees) $query->minCapacity($attendees);
        $rooms = $query->with('location')->get();

        // Try shifting by 30-min increments, up to ±2 hours
        $shifts = [-30, 30, -60, 60, -90, 90, -120, 120];

        foreach ($shifts as $shiftMinutes) {
            $newStart = $date->copy()->setTime($startTime->hour, $startTime->minute)->addMinutes($shiftMinutes);
            $newEnd = $newStart->copy()->addMinutes($durationMinutes);

            // Skip if outside operating hours
            if ($newStart->hour < self::OPEN_HOUR || $newEnd->hour > self::CLOSE_HOUR) {
                continue;
            }
            if ($newEnd->hour === self::CLOSE_HOUR && $newEnd->minute > 0) {
                continue;
            }

            foreach ($rooms as $room) {
                if ($this->isAvailable($room->id, $newStart, $newEnd)) {
                    $suggestions->push([
                        'room' => [
                            'id' => $room->id,
                            'name' => $room->name,
                            'capacity' => $room->capacity,
                            'location' => $room->location->name,
                        ],
                        'start_time' => $newStart->toDateTimeString(),
                        'end_time' => $newEnd->toDateTimeString(),
                        'type' => 'nearby_time',
                    ]);
                }
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
            $query->where('capacity', '>=', max(1, (int)($attendees * 0.8)));
        }
        $rooms = $query->get();

        $start = $date->copy()->setTime($startTime->hour, $startTime->minute);
        $end = $date->copy()->setTime($endTime->hour, $endTime->minute);

        foreach ($rooms as $room) {
            // Skip rooms from the originally requested location (those would be in nearby_times)
            if ($locationId && $room->location_id === $locationId) {
                continue;
            }

            if ($this->isAvailable($room->id, $start, $end)) {
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
