<?php

namespace App\Services;

use App\Enums\WaitlistStatus;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\WaitlistAvailableNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class WaitlistService
{
    public function __construct(
        private AvailabilityService $availabilityService,
        private NotificationService $notificationService
    ) {}

    /**
     * Join the waitlist for a room + time slot.
     *
     * Joining is only meaningful while the slot is currently taken
     * (approved booking or blackout) — otherwise the user can book directly.
     */
    public function join(User $user, int $roomId, Carbon $start, Carbon $end, ?int $attendees = null): WaitlistEntry
    {
        $room = Room::find($roomId);

        if (! $room || ! $room->is_active) {
            throw ValidationException::withMessages([
                'room_id' => 'The selected room is not available.',
            ]);
        }

        if ($start->isPast()) {
            throw ValidationException::withMessages([
                'start_time' => 'Cannot join the waitlist for a time slot in the past.',
            ]);
        }

        if ($this->availabilityService->isAvailable($roomId, $start, $end)) {
            throw ValidationException::withMessages([
                'start_time' => 'This time slot is currently available — you can book it directly instead.',
            ]);
        }

        // The duplicate check + insert run inside a transaction with the room
        // row locked, so two concurrent joins for the same slot cannot both
        // pass the check (no DB constraint can express "no overlapping
        // active entries").
        return DB::transaction(function () use ($user, $roomId, $start, $end, $attendees) {
            DB::table('rooms')->where('id', $roomId)->lockForUpdate()->first();

            $duplicate = WaitlistEntry::where('user_id', $user->id)
                ->where('room_id', $roomId)
                ->where('status', WaitlistStatus::Active)
                ->where('start_time', '<', $end)
                ->where('end_time', '>', $start)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'duplicate' => 'You are already on the waitlist for this room at a similar time.',
                ]);
            }

            return WaitlistEntry::create([
                'user_id' => $user->id,
                'room_id' => $roomId,
                'start_time' => $start,
                'end_time' => $end,
                'attendees' => $attendees,
                'status' => WaitlistStatus::Active,
            ]);
        });
    }

    /**
     * Leave the waitlist. Only the owner can remove their own entry.
     */
    public function leave(WaitlistEntry $entry, User $user): void
    {
        if ($entry->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'authorization' => 'You cannot remove another user\'s waitlist entry.',
            ]);
        }

        $entry->delete();
    }

    /**
     * When an approved booking is cancelled (or otherwise frees a slot),
     * notify everyone waiting on an overlapping slot.
     */
    public function notifyForFreedSlot(Booking $booking): void
    {
        $entries = WaitlistEntry::with('user')
            ->where('room_id', $booking->room_id)
            ->where('status', WaitlistStatus::Active)
            ->where('start_time', '<', $booking->end_time)
            ->where('end_time', '>', $booking->start_time)
            ->get();

        foreach ($entries as $entry) {
            try {
                $entry->update([
                    'status' => WaitlistStatus::Notified,
                    'notified_at' => now(),
                ]);

                $entry->user->notify(new WaitlistAvailableNotification($booking, $entry));

                $this->notificationService->createInAppNotification(
                    $entry->user,
                    $booking,
                    'waitlist_available',
                    "Good news! “{$booking->room->name}” is available for your requested slot — book it before someone else does.",
                    [
                        'room' => $booking->room->name,
                        'start_time' => $entry->start_time->toIso8601String(),
                        'end_time' => $entry->end_time->toIso8601String(),
                    ]
                );
            } catch (\Exception $e) {
                Log::error('Waitlist notification dispatch failed', [
                    'waitlist_entry_id' => $entry->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Mark waitlist entries whose slot has already passed as expired.
     *
     * @return int number of entries expired
     */
    public function expirePastEntries(): int
    {
        return WaitlistEntry::where('status', WaitlistStatus::Active)
            ->where('end_time', '<', now())
            ->update(['status' => WaitlistStatus::Expired]);
    }
}
