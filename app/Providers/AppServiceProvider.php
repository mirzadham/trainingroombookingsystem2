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
    }
}
