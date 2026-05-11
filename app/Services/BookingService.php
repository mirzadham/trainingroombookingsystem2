<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(
        private AvailabilityService $availabilityService,
        private AuditService $auditService
    ) {}

    /**
     * Create a new booking.
     * At booking stage, overlaps with other bookings are ALLOWED.
     * Conflicts are only enforced at approval stage.
     */
    public function create(array $data, User $user): Booking
    {
        $this->validateBookingRules($data);
        $this->preventDuplicate($data, $user);

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

        return $booking->load(['room.location', 'user']);
    }

    /**
     * Cancel an approved booking.
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

        $this->validateBookingRules($data);

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

        // Pre-validate all occurrences
        for ($i = 0; $i < $weeks; $i++) {
            $weekStart = $startTime->copy()->addWeeks($i);
            $weekEnd = $endTime->copy()->addWeeks($i);

            $weekData = array_merge($data, [
                'start_time' => $weekStart->toDateTimeString(),
                'end_time' => $weekEnd->toDateTimeString(),
            ]);

            $this->validateBookingRules($weekData);

            // Check for duplicate for each occurrence
            $this->preventDuplicate($weekData, $user);
        }

        // All validations passed — create all bookings
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

        return $bookings->load(['room.location', 'user']);
    }

    /**
     * Validate booking business rules.
     */
    private function validateBookingRules(array $data): void
    {
        $start = Carbon::parse($data['start_time']);
        $end = Carbon::parse($data['end_time']);
        $now = Carbon::now();

        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');
        $minDuration = config('booking.min_duration_minutes');
        $maxDuration = config('booking.max_duration_minutes');
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
            throw ValidationException::withMessages([
                'duration' => "Maximum booking duration is {$maxHours} hours.",
            ]);
        }

        // Same-day booking must be at least N minutes before start
        if ($start->isSameDay($now) && $start->diffInMinutes($now, false) > -$advanceMinutes) {
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
            $room = Room::find($data['room_id']);
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
}
