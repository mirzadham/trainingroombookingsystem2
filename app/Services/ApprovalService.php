<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Services\NotificationService;
use Illuminate\Validation\ValidationException;

class ApprovalService
{
    public function __construct(
        private AvailabilityService $availabilityService,
        private AuditService $auditService,
        private NotificationService $notificationService
    ) {}

    /**
     * Approve a pending booking.
     * Uses DB transaction + row locking to prevent concurrent approval conflicts.
     */
    public function approve(Booking $booking, User $admin): Booking
    {
        $this->validateAdminAccess($booking, $admin);

        if (!$booking->canTransitionTo(BookingStatus::Approved)) {
            throw ValidationException::withMessages([
                'status' => "Cannot approve a booking with status '{$booking->status->value}'.",
            ]);
        }

        return DB::transaction(function () use ($booking, $admin) {
            // Lock the booking row for update
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);

            // Re-check status (may have changed between initial check and lock)
            if ($booking->status !== BookingStatus::Pending) {
                throw ValidationException::withMessages([
                    'status' => 'This booking is no longer pending.',
                ]);
            }

            // Re-check availability with lock — this is the CRITICAL check
            if ($this->availabilityService->hasConflict(
                $booking->room_id,
                $booking->start_time,
                $booking->end_time,
                $booking->id
            )) {
                throw ValidationException::withMessages([
                    'conflict' => 'Cannot approve: another booking has been approved for this time slot.',
                ]);
            }

            $booking->update([
                'status' => BookingStatus::Approved,
                'approved_by' => $admin->id,
                'approved_at' => Carbon::now(),
            ]);

            $this->auditService->log($admin, $booking, 'approved');
            $this->notificationService->sendBookingNotification($booking, 'approved');

            return $booking->fresh(['room.location', 'user', 'approver']);
        });
    }

    /**
     * Reject a pending booking.
     * Admin MUST provide a rejection reason.
     */
    public function reject(Booking $booking, User $admin, string $reason): Booking
    {
        $this->validateAdminAccess($booking, $admin);

        if (!$booking->canTransitionTo(BookingStatus::Rejected)) {
            throw ValidationException::withMessages([
                'status' => "Cannot reject a booking with status '{$booking->status->value}'.",
            ]);
        }

        if (empty(trim($reason))) {
            throw ValidationException::withMessages([
                'rejection_reason' => 'A rejection reason is required.',
            ]);
        }

        $booking->update([
            'status' => BookingStatus::Rejected,
            'rejection_reason' => $reason,
        ]);

        $this->auditService->log($admin, $booking, 'rejected', [
            'rejection_reason' => $reason,
        ]);
        $this->notificationService->sendBookingNotification($booking, 'rejected');

        return $booking->fresh(['room.location', 'user']);
    }

    /**
     * Admin edits a booking.
     * Must re-validate availability and log changes.
     */
    public function adminUpdate(Booking $booking, array $data, User $admin): Booking
    {
        $this->validateAdminAccess($booking, $admin);

        $before = $booking->only(['title', 'description', 'start_time', 'end_time', 'attendees', 'room_id', 'phone']);

        // If time/room changed on an approved booking, re-validate availability
        if ($booking->status === BookingStatus::Approved) {
            $newStart = isset($data['start_time']) ? Carbon::parse($data['start_time']) : $booking->start_time;
            $newEnd = isset($data['end_time']) ? Carbon::parse($data['end_time']) : $booking->end_time;
            $newRoomId = $data['room_id'] ?? $booking->room_id;

            if ($this->availabilityService->hasConflict($newRoomId, $newStart, $newEnd, $booking->id)) {
                throw ValidationException::withMessages([
                    'conflict' => 'Cannot update: the new time slot conflicts with another approved booking.',
                ]);
            }
        }

        $booking->update(array_filter([
            'room_id' => $data['room_id'] ?? null,
            'title' => $data['title'] ?? null,
            'description' => $data['description'] ?? null,
            'start_time' => $data['start_time'] ?? null,
            'end_time' => $data['end_time'] ?? null,
            'attendees' => $data['attendees'] ?? null,
            'phone' => $data['phone'] ?? null,
        ], fn($v) => !is_null($v)));

        $after = $booking->only(['title', 'description', 'start_time', 'end_time', 'attendees', 'room_id', 'phone']);

        $this->auditService->log($admin, $booking, 'admin_updated', [
            'before' => $before,
            'after' => $after,
        ]);

        return $booking->fresh(['room.location', 'user']);
    }

    /**
     * Admin cancels an approved (or pending) booking.
     * Admin MUST provide a cancellation reason/remarks.
     */
    public function adminCancel(Booking $booking, User $admin, string $reason): Booking
    {
        $this->validateAdminAccess($booking, $admin);

        if (!$booking->canTransitionTo(BookingStatus::Cancelled)) {
            throw ValidationException::withMessages([
                'status' => "Cannot cancel a booking with status '{$booking->status->value}'.",
            ]);
        }

        if (empty(trim($reason))) {
            throw ValidationException::withMessages([
                'remarks' => 'A cancellation reason is required.',
            ]);
        }

        $oldStatus = $booking->status;

        $booking->update([
            'status' => BookingStatus::Cancelled,
            'cancellation_reason' => $reason,
            'cancelled_by' => $admin->id,
        ]);

        $this->auditService->log($admin, $booking, 'admin_cancelled', [
            'before' => ['status' => $oldStatus->value],
            'after' => ['status' => BookingStatus::Cancelled->value],
            'cancellation_reason' => $reason,
        ]);
        $this->notificationService->sendBookingNotification($booking, 'admin_cancelled');

        return $booking->fresh(['room.location', 'user', 'canceller']);
    }

    /**
     * Validate that the admin has access to this booking's location.
     */
    private function validateAdminAccess(Booking $booking, User $admin): void
    {
        if (!$admin->isAdmin()) {
            throw ValidationException::withMessages([
                'authorization' => 'You do not have admin privileges.',
            ]);
        }

        // Load the room's location if not loaded
        $booking->loadMissing('room.location');
        $locationId = $booking->room->location_id;

        if (!$admin->hasLocationAccess($locationId)) {
            throw ValidationException::withMessages([
                'authorization' => 'You do not have access to bookings at this location.',
            ]);
        }
    }
}
