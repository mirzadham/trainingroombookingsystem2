<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\BookingNotification;
use App\Notifications\BookingStatusChangedNotification;
use Carbon\Carbon;
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

        try {
            $recipient->notify(new BookingStatusChangedNotification($booking, $type));
        } catch (Exception $e) {
            Log::error('Booking email notification dispatch failed', [
                'booking_id' => $booking->id,
                'type' => $type,
                'error' => $e->getMessage()
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
     * Notify all relevant location admins and super admins of a new booking request.
     */
    protected function notifyAdminsOfNewBooking(Booking $booking): void
    {
        try {
            $booking->loadMissing('room.location');
            $locationId = $booking->room->location_id;

            $admins = \App\Models\User::whereIn('role', [\App\Enums\UserRole::SuperAdmin, \App\Enums\UserRole::LocationAdmin])
                ->where(function ($q) use ($locationId) {
                    $q->where('role', \App\Enums\UserRole::SuperAdmin)
                      ->orWhere('location_id', $locationId);
                })
                ->where('status', '!=', 'suspended')
                ->get();

            foreach ($admins as $admin) {
                $admin->notify(new \App\Notifications\AdminNewBookingNotification($booking));
            }
        } catch (Exception $e) {
            Log::error('Admin new booking notification dispatch failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage()
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

            $admins = \App\Models\User::whereIn('role', [\App\Enums\UserRole::SuperAdmin, \App\Enums\UserRole::LocationAdmin])
                ->where(function ($q) use ($locationId) {
                    $q->where('role', \App\Enums\UserRole::SuperAdmin)
                      ->orWhere('location_id', $locationId);
                })
                ->where('status', '!=', 'suspended')
                ->get();

            foreach ($admins as $admin) {
                $admin->notify(new \App\Notifications\AdminBookingCancelledNotification($booking, $oldStatus));
            }
        } catch (Exception $e) {
            Log::error('Admin booking cancellation notification dispatch failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
