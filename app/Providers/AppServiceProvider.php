<?php

namespace App\Providers;

use App\Models\Booking;
use App\Models\Room;
use App\Policies\BookingPolicy;
use App\Policies\RoomPolicy;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Disable default {data: ...} wrapping on API Resources
        // to maintain backward compatibility with the existing frontend.
        JsonResource::withoutWrapping();

        Gate::policy(Booking::class, BookingPolicy::class);
        Gate::policy(Room::class, RoomPolicy::class);

        // Listen for booking notification delivery attempt
        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Notifications\Events\NotificationSending::class,
            function (\Illuminate\Notifications\Events\NotificationSending $event) {
                if ($event->notification instanceof \App\Notifications\BookingStatusChangedNotification) {
                    $booking = $event->notification->getBooking();
                    $type = $event->notification->getType();

                    \App\Models\BookingNotification::where('booking_id', $booking->id)
                        ->where('type', $type)
                        ->increment('attempts');
                }
            }
        );

        // Listen for booking notification delivery success
        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Notifications\Events\NotificationSent::class,
            function (\Illuminate\Notifications\Events\NotificationSent $event) {
                if ($event->notification instanceof \App\Notifications\BookingStatusChangedNotification) {
                    $booking = $event->notification->getBooking();
                    $type = $event->notification->getType();

                    \App\Models\BookingNotification::where('booking_id', $booking->id)
                        ->where('type', $type)
                        ->update([
                            'status' => 'sent',
                            'sent_at' => now(),
                        ]);
                }
            }
        );

        // Listen for booking notification delivery failure
        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Notifications\Events\NotificationFailed::class,
            function (\Illuminate\Notifications\Events\NotificationFailed $event) {
                if ($event->notification instanceof \App\Notifications\BookingStatusChangedNotification) {
                    $booking = $event->notification->getBooking();
                    $type = $event->notification->getType();
                    
                    $exception = $event->data['exception'] ?? null;
                    $errorMessage = $exception ? $exception->getMessage() : 'SMTP mail delivery failed.';

                    \App\Models\BookingNotification::where('booking_id', $booking->id)
                        ->where('type', $type)
                        ->update([
                            'status' => 'failed',
                            'error_message' => substr($errorMessage, 0, 1000),
                        ]);
                }
            }
        );
    }
}
