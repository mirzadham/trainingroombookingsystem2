<?php

namespace App\Providers;

use App\Models\Booking;
use App\Models\BookingNotification;
use App\Models\Room;
use App\Notifications\BookingStatusChangedNotification;
use App\Policies\BookingPolicy;
use App\Policies\RoomPolicy;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSending;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
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
        Event::listen(
            NotificationSending::class,
            function (NotificationSending $event) {
                if ($event->notification instanceof BookingStatusChangedNotification) {
                    $booking = $event->notification->getBooking();
                    $type = $event->notification->getType();

                    BookingNotification::where('booking_id', $booking->id)
                        ->where('type', $type)
                        ->increment('attempts');
                }
            }
        );

        // Listen for booking notification delivery success
        Event::listen(
            NotificationSent::class,
            function (NotificationSent $event) {
                if ($event->notification instanceof BookingStatusChangedNotification) {
                    $booking = $event->notification->getBooking();
                    $type = $event->notification->getType();

                    BookingNotification::where('booking_id', $booking->id)
                        ->where('type', $type)
                        ->update([
                            'status' => 'sent',
                            'sent_at' => now(),
                        ]);
                }
            }
        );

        // Listen for booking notification delivery failure
        Event::listen(
            NotificationFailed::class,
            function (NotificationFailed $event) {
                if ($event->notification instanceof BookingStatusChangedNotification) {
                    $booking = $event->notification->getBooking();
                    $type = $event->notification->getType();

                    $exception = $event->data['exception'] ?? null;
                    $errorMessage = $exception ? $exception->getMessage() : 'SMTP mail delivery failed.';

                    BookingNotification::where('booking_id', $booking->id)
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
