<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingNotification;
use App\Notifications\BookingStatusChangedNotification;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function sendBookingNotification(Booking $booking, string $type): BookingNotification
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
            $notifRecord->increment('attempts');
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

        return $notifRecord;
    }
}
