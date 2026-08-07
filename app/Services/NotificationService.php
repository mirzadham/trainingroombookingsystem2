<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\BookingNotification;
use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\AdminBookingCancelledNotification;
use App\Notifications\AdminNewBookingNotification;
use App\Notifications\BookingStatusChangedNotification;
use Exception;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function sendBookingNotification(Booking $booking, string $type, ?BookingStatus $oldStatus = null): BookingNotification
    {
        $recipient = $booking->user;

        // Initialize log record in database
        $notifRecord = BookingNotification::create([
            'user_id' => $recipient->id,
            'booking_id' => $booking->id,
            'type' => $type,
            'channel' => 'email',
            'status' => 'pending',
            'attempts' => 0,
        ]);

        // In-app notification for the booking owner (notification centre)
        $this->createInAppNotification($recipient, $booking, $type, $this->inAppMessageForType($type, $booking));

        try {
            $recipient->notify(new BookingStatusChangedNotification($booking, $type));
        } catch (Exception $e) {
            Log::error('Booking email notification dispatch failed', [
                'booking_id' => $booking->id,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            $notifRecord->update([
                'status' => 'failed',
                'error_message' => substr($e->getMessage(), 0, 1000),
            ]);
        }

        // Notify admins of new booking submissions
        if ($type === 'submitted') {
            $this->notifyAdminsOfNewBooking($booking);
        }

        // Notify admins when a user cancels an approved booking or withdraws a pending request
        if ($type === 'cancelled') {
            $this->notifyAdminsOfCancellation($booking, $oldStatus);
        }

        return $notifRecord;
    }

    /**
     * Create an in-app notification (notification centre) record.
     */
    public function createInAppNotification(User $user, ?Booking $booking, string $type, string $message, array $data = []): UserNotification
    {
        return UserNotification::create([
            'user_id' => $user->id,
            'booking_id' => $booking?->id,
            'type' => $type,
            'message' => $message,
            'data' => $data,
        ]);
    }

    /**
     * Human-readable in-app message for booking status change types.
     */
    protected function inAppMessageForType(string $type, Booking $booking): string
    {
        $room = $booking->room?->name ?? 'the room';

        return match ($type) {
            'submitted' => "Your booking request for {$room} has been submitted and is awaiting approval.",
            'approved' => "Your booking for {$room} has been approved.",
            'rejected' => "Your booking request for {$room} was rejected.",
            'cancelled' => "Your booking for {$room} has been cancelled.",
            'admin_cancelled' => "An administrator cancelled your booking for {$room}.",
            'expired' => "Your pending booking request for {$room} expired because it was not answered in time.",
            default => 'Your booking status has changed.',
        };
    }

    /**
     * Notify all relevant location admins and super admins of a new booking request.
     */
    protected function notifyAdminsOfNewBooking(Booking $booking): void
    {
        try {
            $booking->loadMissing('room.location');
            $locationId = $booking->room->location_id;

            $admins = User::whereIn('role', [UserRole::SuperAdmin, UserRole::LocationAdmin])
                ->where(function ($q) use ($locationId) {
                    $q->where('role', UserRole::SuperAdmin)
                        ->orWhere('location_id', $locationId);
                })
                ->where('status', '!=', 'suspended')
                ->get();

            foreach ($admins as $admin) {
                $admin->notify(new AdminNewBookingNotification($booking));
            }
        } catch (Exception $e) {
            Log::error('Admin new booking notification dispatch failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify all relevant location admins and super admins when a user cancels their booking.
     */
    protected function notifyAdminsOfCancellation(Booking $booking, ?BookingStatus $oldStatus): void
    {
        try {
            $booking->loadMissing('room.location');
            $locationId = $booking->room->location_id;

            $admins = User::whereIn('role', [UserRole::SuperAdmin, UserRole::LocationAdmin])
                ->where(function ($q) use ($locationId) {
                    $q->where('role', UserRole::SuperAdmin)
                        ->orWhere('location_id', $locationId);
                })
                ->where('status', '!=', 'suspended')
                ->get();

            foreach ($admins as $admin) {
                $admin->notify(new AdminBookingCancelledNotification($booking, $oldStatus));
            }
        } catch (Exception $e) {
            Log::error('Admin booking cancellation notification dispatch failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
