<?php

namespace App\Services;

use App\Models\Booking;
use App\Notifications\BookingReminderNotification;
use Exception;
use Illuminate\Support\Facades\Log;

class ReminderService
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    /**
     * Send email + in-app reminders for approved bookings starting within
     * the given window (default: next 24 hours).
     *
     * Each booking is only reminded once (tracked via reminder_sent_at).
     *
     * @return int number of reminders sent
     */
    public function sendUpcomingReminders(int $windowHours = 24): int
    {
        $windowStart = now();
        $windowEnd = now()->addHours($windowHours);

        $sent = 0;

        Booking::approved()
            ->with(['room.location', 'user'])
            ->where('start_time', '>=', $windowStart)
            ->where('start_time', '<=', $windowEnd)
            ->whereNull('reminder_sent_at')
            ->chunkById(100, function ($bookings) use (&$sent) {
                foreach ($bookings as $booking) {
                    try {
                        $booking->user->notify(new BookingReminderNotification($booking));

                        $booking->update(['reminder_sent_at' => now()]);

                        $this->notificationService->createInAppNotification(
                            $booking->user,
                            $booking,
                            'reminder',
                            "Reminder: Your booking “{$booking->title}” starts soon.",
                            ['room' => $booking->room->name]
                        );

                        $sent++;
                    } catch (Exception $e) {
                        Log::error('Booking reminder dispatch failed', [
                            'booking_id' => $booking->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

        return $sent;
    }
}
