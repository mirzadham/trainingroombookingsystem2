<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Support\Facades\Log;

class PendingExpiryService
{
    public function __construct(
        private AuditService $auditService,
        private NotificationService $notificationService
    ) {}

    /**
     * Auto-reject pending bookings that have not been answered by an
     * administrator within the given number of days.
     *
     * @return int number of bookings expired
     */
    public function expirePendingBookings(int $days = 7): int
    {
        $cutoff = now()->subDays($days);
        $expired = 0;

        Booking::pending()
            ->with(['user', 'room.location'])
            ->where('created_at', '<', $cutoff)
            ->chunkById(100, function ($bookings) use (&$expired, $days) {
                foreach ($bookings as $booking) {
                    try {
                        $booking->update([
                            'status' => BookingStatus::Rejected,
                            'rejection_reason' => 'Auto-expired: no response from the administrator within '.$days.' days.',
                            'rejected_by' => null,
                        ]);

                        $this->auditService->log($booking->user, $booking, 'auto_expired', [
                            'reason' => 'Pending for more than '.$days.' days',
                            'expired_at' => now()->toDateTimeString(),
                        ]);

                        // Email + in-app notification to the requester
                        $this->notificationService->sendBookingNotification($booking, 'expired');

                        $expired++;
                    } catch (\Exception $e) {
                        Log::error('Pending booking expiry failed', [
                            'booking_id' => $booking->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

        return $expired;
    }
}
