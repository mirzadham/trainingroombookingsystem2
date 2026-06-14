<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AvailabilityService
{
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

        // Check for any overlapping room blackouts
        $hasBlackout = \App\Models\RoomBlackout::where('room_id', $roomId)
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start)
            ->exists();

        return !$hasBlackout;
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

        $roomIds = $rooms->pluck('id')->toArray();

        // Batch fetch overlapping approved bookings for all candidate rooms
        $overlappingBookings = Booking::approved()
            ->whereIn('room_id', $roomIds)
            ->overlapping($start, $end)
            ->pluck('room_id')
            ->toArray();

        // Batch fetch overlapping blackouts for all candidate rooms
        $overlappingBlackouts = \App\Models\RoomBlackout::whereIn('room_id', $roomIds)
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start)
            ->pluck('room_id')
            ->toArray();

        $occupiedRoomIds = array_unique(array_merge($overlappingBookings, $overlappingBlackouts));

        // Filter rooms that are available for the requested time
        return $rooms->map(function ($room) use ($occupiedRoomIds) {
            $room->is_available = !in_array($room->id, $occupiedRoomIds);
            return $room;
        });
    }

    /**
     * Generate timeline grid data for a location on a specific date.
     * Returns rooms as rows with time slot availability.
     */
    public function getTimelineGrid(?int $locationId, Carbon $date, ?Carbon $endDate = null): array
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

        // Get all overlapping blackouts for these rooms in the range
        $blackouts = \App\Models\RoomBlackout::whereIn('room_id', $rooms->pluck('id'))
            ->where('start_time', '<', $dayEnd)
            ->where('end_time', '>', $dayStart)
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

                        // Convert to UTC for matching since $booking->start_time and end_time are in UTC
                        $currentStartUtc = $currentStart->copy()->setTimezone('UTC');
                        $currentEndUtc = $currentEnd->copy()->setTimezone('UTC');

                        $overlappingBooking = $roomBookings->first(function ($booking) use ($currentStartUtc, $currentEndUtc) {
                            return $booking->start_time < $currentEndUtc && $booking->end_time > $currentStartUtc;
                        });

                        $overlappingBlackout = $roomBlackouts->first(function ($bo) use ($currentStartUtc, $currentEndUtc) {
                            return Carbon::parse($bo->start_time) < $currentEndUtc && Carbon::parse($bo->end_time) > $currentStartUtc;
                        });

                        if ($overlappingBooking || $overlappingBlackout) {
                            $isOccupied = true;
                            break;
                        }
                    }
                } else {
                    // Single day check
                    $currentStartUtc = $slotStart->copy()->setTimezone('Asia/Kuala_Lumpur')->setTimezone('UTC');
                    $currentEndUtc = $slotEnd->copy()->setTimezone('Asia/Kuala_Lumpur')->setTimezone('UTC');

                    $overlappingBooking = $roomBookings->first(function ($booking) use ($currentStartUtc, $currentEndUtc) {
                        return $booking->start_time < $currentEndUtc && $booking->end_time > $currentStartUtc;
                    });

                    $overlappingBlackout = $roomBlackouts->first(function ($bo) use ($currentStartUtc, $currentEndUtc) {
                        return Carbon::parse($bo->start_time) < $currentEndUtc && Carbon::parse($bo->end_time) > $currentStartUtc;
                    });

                    $isOccupied = (bool)($overlappingBooking || $overlappingBlackout);
                }

                $status = 'available';
                $bookingId = null;
                $bookingTitle = null;

                if ($overlappingBlackout) {
                    $status = 'occupied';
                    $bookingTitle = 'Maintenance / Blackout: ' . $overlappingBlackout->title;
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
        if ($locationId) $query->where('location_id', $locationId);
        if ($attendees) $query->minCapacity($attendees);
        $rooms = $query->with('location')->get();

        // Try shifting by 30-min increments, up to ±2 hours
        $shifts = [-30, 30, -60, 60, -90, 90, -120, 120];

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
