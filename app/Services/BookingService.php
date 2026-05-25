<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\NotificationService;
use Illuminate\Validation\ValidationException;

class BookingService
{
    private array $roomCache = [];

    public function __construct(
        private AvailabilityService $availabilityService,
        private AuditService $auditService,
        private NotificationService $notificationService
    ) {}

    /**
     * Create consecutive multi-day bookings.
     * Expands the date range (start_date → end_date) into one Booking record per day,
     * all sharing the same group_id, wrapped in a DB transaction for atomicity.
     */
    public function createMultiDayBookings(array $data, User $user): Collection
    {
        $startDate = Carbon::parse($data['start_date']);
        $endDate   = Carbon::parse($data['end_date']);

        $this->validateMultiDayRules($data, $startDate, $endDate);

        // Extract time-of-day portion from start_time / end_time strings (e.g. "09:00:00" → "09:00")
        $rawStart = Carbon::parse($data['start_time']);
        $rawEnd   = Carbon::parse($data['end_time']);
        $timeStart = $rawStart->format('H:i:s');
        $timeEnd   = $rawEnd->format('H:i:s');

        $groupId = Str::uuid()->toString();
        $bookings = collect();
        $unavailableDates = collect();
        $maxMultidayDuration = (int) config('booking.max_multiday_duration_minutes', 1140);

        return DB::transaction(function () use ($data, $user, $startDate, $endDate, $timeStart, $timeEnd, $groupId, $bookings, $unavailableDates, $maxMultidayDuration) {
            // Iterate inclusive from start_date to end_date
            for ($current = $startDate->copy(); $current->lte($endDate); $current->addDay()) {
                // Build MYT datetimes (local time = clock-face hours from booking config)
                $dayStart = Carbon::createFromTimeString($timeStart, 'Asia/Kuala_Lumpur')
                    ->setDate($current->year, $current->month, $current->day);
                $dayEnd   = Carbon::createFromTimeString($timeEnd, 'Asia/Kuala_Lumpur')
                    ->setDate($current->year, $current->month, $current->day);

                // 1) Check availability in MYT — AvailabilityService::hasConflict converts
                //    to the app DB timezone internally, so MYT is fine here.
                if ($this->availabilityService->hasConflict($data['room_id'], $dayStart, $dayEnd)) {
                    $unavailableDates->push($current->format('Y-m-d'));
                    continue;
                }

                // 2) Strict validation using MYT so that operating-hours comparisons
                //    match app-timezone values.  Uses the multi-day duration cap so that
                //    longer but valid consecutive bookings are accepted.
                $this->validateBookingRules([
                    'start_time' => $dayStart->toDateTimeString(),
                    'end_time'   => $dayEnd->toDateTimeString(),
                    'room_id'    => $data['room_id'],
                    'attendees'  => $data['attendees'],
                ], $maxMultidayDuration);

                // 3) Convert to UTC only for persistence in the database.
                $dayStartUtc = $dayStart->copy()->setTimezone('UTC');
                $dayEndUtc   = $dayEnd->copy()->setTimezone('UTC');

                $booking = Booking::create([
                    'user_id'              => $user->id,
                    'room_id'              => $data['room_id'],
                    'title'                => $data['title'],
                    'description'          => $data['description'] ?? null,
                    'start_time'           => $dayStartUtc,
                    'end_time'             => $dayEndUtc,
                    'attendees'            => $data['attendees'],
                    'phone'                => $data['phone'],
                    'status'               => BookingStatus::Pending,
                    'group_id'             => $groupId,
                ]);

                $this->auditService->log($user, $booking, 'created', [
                    'group_id'            => $groupId,
                    'booking_date'        => $current->format('Y-m-d'),
                    'multi_day_booking'   => true,
                ]);

                $bookings->push($booking);
            }

            // If every single day was unavailable, throw a helpful error
            if ($bookings->isEmpty() && $unavailableDates->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'end_date' => 'The selected room is unavailable for all dates in the range '
                        . $startDate->format('Y-m-d') . ' to ' . $endDate->format('Y-m-d')
                        . '. Please select a different room or time slot.',
                ]);
            }

            // If only *some* days were unavailable, surface the specific dates
            if ($unavailableDates->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'end_date' => 'The selected room is unavailable on the following dates: '
                        . $unavailableDates->join(', ') . '. Please adjust your date range.',
                ]);
            }

            return $bookings;
        });

        // Send a single notification for the entire multi-day series after the transaction commits successfully
        if ($bookings->isNotEmpty()) {
            $this->notificationService->sendBookingNotification($bookings->first(), 'submitted');
        }

        return $bookings;
    }

    /**
     * Only validation relevant to the multi-day range itself.
     * Per-day time/occupancy rules are enforced inside createMultiDayBookings.
     */
    private function validateMultiDayRules(array $data, Carbon $startDate, Carbon $endDate): void
    {
        $maxDays = (int) config('booking.max_duration_days', 14);
        $totalDays = $startDate->diffInDays($endDate) + 1; // inclusive

        if ($totalDays > $maxDays) {
            throw ValidationException::withMessages([
                'end_date' => "Consecutive multi-day bookings cannot exceed {$maxDays} days.",
            ]);
        }
    }

    /**
     * Create a new booking.
     * At booking stage, overlaps with other bookings are ALLOWED.
     * Conflicts are only enforced at approval stage.
     * However, blackout periods always block bookings immediately.
     */
    public function create(array $data, User $user): Booking
    {
        $this->validateBookingRules($data);
        $this->preventDuplicate($data, $user);
        $this->preventBlackoutOverlap($data);

        $booking = Booking::create([
            'user_id' => $user->id,
            'room_id' => $data['room_id'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'attendees' => $data['attendees'],
            'phone' => $data['phone'],
            'status' => BookingStatus::Pending,
        ]);

        $this->auditService->log($user, $booking, 'created');
        $this->notificationService->sendBookingNotification($booking, 'submitted');

        return $booking->load(['room.location', 'user']);
    }

    /**
     * Cancel a pending or approved booking.
     * Only the booking owner or an admin can cancel.
     */
    public function cancel(Booking $booking, User $user): Booking
    {
        if (!$booking->canTransitionTo(BookingStatus::Cancelled)) {
            throw ValidationException::withMessages([
                'status' => "Cannot cancel a booking with status '{$booking->status->value}'.",
            ]);
        }

        $oldStatus = $booking->status;
        $booking->update(['status' => BookingStatus::Cancelled]);

        $this->auditService->log($user, $booking, 'cancelled', [
            'before' => ['status' => $oldStatus->value],
            'after' => ['status' => BookingStatus::Cancelled->value],
        ]);
        $this->notificationService->sendBookingNotification($booking, 'cancelled');

        return $booking->fresh(['room.location', 'user']);
    }

    /**
     * Update a pending booking.
     * Only pending bookings can be updated.
     */
    public function update(Booking $booking, array $data, User $user): Booking
    {
        if ($booking->status !== BookingStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => 'Only pending bookings can be updated.',
            ]);
        }

        // Merge existing booking details with new data to validate complete rules
        $validationData = array_merge([
            'room_id' => $booking->room_id,
            'start_time' => $booking->start_time->toDateTimeString(),
            'end_time' => $booking->end_time->toDateTimeString(),
            'attendees' => $booking->attendees,
        ], $data);

        $this->validateBookingRules($validationData);

        $before = $booking->only(['title', 'description', 'start_time', 'end_time', 'attendees', 'room_id', 'phone']);

        $booking->update([
            'room_id' => $data['room_id'] ?? $booking->room_id,
            'title' => $data['title'] ?? $booking->title,
            'description' => $data['description'] ?? $booking->description,
            'start_time' => $data['start_time'] ?? $booking->start_time,
            'end_time' => $data['end_time'] ?? $booking->end_time,
            'attendees' => $data['attendees'] ?? $booking->attendees,
            'phone' => $data['phone'] ?? $booking->phone,
        ]);

        $after = $booking->only(['title', 'description', 'start_time', 'end_time', 'attendees', 'room_id', 'phone']);

        $this->auditService->log($user, $booking, 'updated', [
            'before' => $before,
            'after' => $after,
        ]);

        return $booking->fresh(['room.location', 'user']);
    }

    /**
     * Create a recurring weekly booking series.
     * All-or-nothing: validate ALL occurrences before creating any.
     */
    public function createRecurringSeries(array $data, User $user, int $weeks): Collection
    {
        $this->validateBookingRules($data);

        $groupId = Str::uuid()->toString();
        $bookings = collect();
        $startTime = Carbon::parse($data['start_time']);
        $endTime = Carbon::parse($data['end_time']);

        $seriesStart = $startTime;
        $seriesEnd = $endTime->copy()->addWeeks($weeks - 1);

        // Batch fetch existing bookings for this user and room within the outer boundaries
        $existingBookings = Booking::where('user_id', $user->id)
            ->where('room_id', $data['room_id'])
            ->whereNotIn('status', [BookingStatus::Rejected, BookingStatus::Cancelled])
            ->where('start_time', '<', $seriesEnd)
            ->where('end_time', '>', $seriesStart)
            ->get();

        // Batch fetch blackouts for this room within the outer boundaries
        $blackouts = \App\Models\RoomBlackout::where('room_id', $data['room_id'])
            ->where('start_time', '<', $seriesEnd)
            ->where('end_time', '>', $seriesStart)
            ->get();

        // Pre-validate all occurrences
        for ($i = 0; $i < $weeks; $i++) {
            $weekStart = $startTime->copy()->addWeeks($i);
            $weekEnd = $endTime->copy()->addWeeks($i);

            $weekData = array_merge($data, [
                'start_time' => $weekStart->toDateTimeString(),
                'end_time' => $weekEnd->toDateTimeString(),
            ]);

            $this->validateBookingRules($weekData);

            // In-memory duplicate check
            $duplicate = $existingBookings->first(function ($b) use ($weekStart, $weekEnd) {
                return $b->start_time < $weekEnd && $b->end_time > $weekStart;
            });

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'duplicate' => 'You already have a booking for this room at the same time.',
                ]);
            }

            // In-memory blackout overlap check
            $blackout = $blackouts->first(function ($bo) use ($weekStart, $weekEnd) {
                return $bo->start_time < $weekEnd && $bo->end_time > $weekStart;
            });

            if ($blackout) {
                $blackoutStart = Carbon::parse($blackout->start_time)->format('M j, Y g:i A');
                $blackoutEnd = Carbon::parse($blackout->end_time)->format('M j, Y g:i A');

                throw ValidationException::withMessages([
                    'blackout' => "This room is unavailable during a scheduled blackout period ({$blackout->title}: {$blackoutStart} – {$blackoutEnd}). Please choose a different time or room.",
                ]);
            }
        }

        // All validations passed — create all bookings
        DB::transaction(function () use ($data, $user, $weeks, $groupId, $bookings, $startTime, $endTime) {
            for ($i = 0; $i < $weeks; $i++) {
                $weekStart = $startTime->copy()->addWeeks($i);
                $weekEnd = $endTime->copy()->addWeeks($i);

                $booking = Booking::create([
                    'user_id' => $user->id,
                    'room_id' => $data['room_id'],
                    'title' => $data['title'],
                    'description' => $data['description'] ?? null,
                    'start_time' => $weekStart,
                    'end_time' => $weekEnd,
                    'attendees' => $data['attendees'],
                    'phone' => $data['phone'],
                    'status' => BookingStatus::Pending,
                    'recurrence_group_id' => $groupId,
                ]);

                $this->auditService->log($user, $booking, 'created', [
                    'recurrence_group_id' => $groupId,
                    'occurrence' => $i + 1,
                    'total_occurrences' => $weeks,
                ]);

                $bookings->push($booking);
            }
        });

        // Send a single notification for the entire recurring series after the transaction commits successfully
        if ($bookings->isNotEmpty()) {
            $this->notificationService->sendBookingNotification($bookings->first(), 'submitted');
        }

        return $bookings->load(['room.location', 'user']);
    }

    /**
     * Validate booking business rules.
     * $data params: start_time, end_time, room_id, attendees
     * $maxDurationMinutes: optional override (null = use default single-day cap)
     */
    private function validateBookingRules(array $data, ?int $maxDurationMinutes = null): void
    {
        $start = Carbon::parse($data['start_time']);
        $end = Carbon::parse($data['end_time']);
        $now = Carbon::now();

        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');
        $minDuration = config('booking.min_duration_minutes');
        $maxDuration = $maxDurationMinutes ?? config('booking.max_duration_minutes');
        $advanceMinutes = config('booking.same_day_advance_minutes');

        // Operating hours
        $closeDisplay = $closeHour - 12;
        if ($start->hour < $openHour || $end->hour > $closeHour) {
            throw ValidationException::withMessages([
                'time' => "Bookings must be within operating hours ({$openHour}:00 AM – {$closeDisplay}:00 PM).",
            ]);
        }
        if ($end->hour === $closeHour && $end->minute > 0) {
            throw ValidationException::withMessages([
                'time' => "Bookings must end by {$closeDisplay}:00 PM.",
            ]);
        }

        // End must be after start
        if ($end->lte($start)) {
            throw ValidationException::withMessages([
                'end_time' => 'End time must be after start time.',
            ]);
        }

        // Min duration
        $durationMinutes = $start->diffInMinutes($end);
        if ($durationMinutes < $minDuration) {
            throw ValidationException::withMessages([
                'duration' => "Minimum booking duration is {$minDuration} minutes.",
            ]);
        }

        // Max duration
        if ($durationMinutes > $maxDuration) {
            $maxHours = $maxDuration / 60;
            $displayHours = floor($maxHours) === $maxHours ? (int)$maxHours : round($maxHours, 1);
            throw ValidationException::withMessages([
                'duration' => "Maximum booking duration is {$displayHours} hours.",
            ]);
        }

        // Same-day booking must be at least N minutes before start
        if ($advanceMinutes > 0 && $start->isSameDay($now) && $start->diffInMinutes($now, false) > -$advanceMinutes) {
            throw ValidationException::withMessages([
                'start_time' => "Same-day bookings must be made at least {$advanceMinutes} minutes before the start time.",
            ]);
        }

        // Cannot book in the past
        if ($start->isPast()) {
            throw ValidationException::withMessages([
                'start_time' => 'Cannot book a time slot in the past.',
            ]);
        }

        // Attendees must not exceed room capacity
        if (isset($data['room_id']) && isset($data['attendees'])) {
            $roomId = (int)$data['room_id'];
            if (!isset($this->roomCache[$roomId])) {
                $this->roomCache[$roomId] = Room::find($roomId);
            }
            $room = $this->roomCache[$roomId];
            if ($room && $data['attendees'] > $room->capacity) {
                throw ValidationException::withMessages([
                    'attendees' => "Number of attendees ({$data['attendees']}) exceeds room capacity ({$room->capacity}).",
                ]);
            }
        }
    }

    /**
     * Prevent duplicate bookings: same user + same room + same time.
     */
    private function preventDuplicate(array $data, User $user): void
    {
        $exists = Booking::where('user_id', $user->id)
            ->where('room_id', $data['room_id'])
            ->whereNotIn('status', [BookingStatus::Rejected, BookingStatus::Cancelled])
            ->overlapping($data['start_time'], $data['end_time'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'duplicate' => 'You already have a booking for this room at the same time.',
            ]);
        }
    }

    /**
     * Prevent bookings that overlap with admin-scheduled blackout periods.
     */
    private function preventBlackoutOverlap(array $data): void
    {
        $start = Carbon::parse($data['start_time']);
        $end = Carbon::parse($data['end_time']);

        $blackout = \App\Models\RoomBlackout::where('room_id', $data['room_id'])
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start)
            ->first();

        if ($blackout) {
            $blackoutStart = Carbon::parse($blackout->start_time)->format('M j, Y g:i A');
            $blackoutEnd = Carbon::parse($blackout->end_time)->format('M j, Y g:i A');

            throw ValidationException::withMessages([
                'blackout' => "This room is unavailable during a scheduled blackout period ({$blackout->title}: {$blackoutStart} – {$blackoutEnd}). Please choose a different time or room.",
            ]);
        }
    }
}
