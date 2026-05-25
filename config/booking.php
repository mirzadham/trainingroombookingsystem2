<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Operating Hours
    |--------------------------------------------------------------------------
    |
    | The hours during which rooms are available for booking.
    | Stored as 24-hour integers.
    |
    */

    'operating_hours' => [
        'open' => env('BOOKING_OPEN_HOUR', 7),    // 7 AM
        'close' => env('BOOKING_CLOSE_HOUR', 19),  // 7 PM
    ],

    /*
    |--------------------------------------------------------------------------
    | Time Slot Configuration
    |--------------------------------------------------------------------------
    */

    'slot_duration_minutes' => env('BOOKING_SLOT_MINUTES', 30),

    /*
    |--------------------------------------------------------------------------
    | Booking Duration Limits
    |--------------------------------------------------------------------------
    */

    'min_duration_minutes' => 30,
    'max_duration_minutes' => 480,  // 8 hours (single-day / standard booking)
    'max_multiday_duration_minutes' => 1140,  // 19 hours for consecutive multi-day bookings

    /*
    |--------------------------------------------------------------------------
    | Advance Booking Rules
    |--------------------------------------------------------------------------
    */

    'same_day_advance_minutes' => 0,  // Must book at least 0 minutes ahead for same-day

    /*
    |--------------------------------------------------------------------------
    | Recurring Booking Limits
    |--------------------------------------------------------------------------
    */

    'max_recurring_weeks' => 52,

    /*
    |--------------------------------------------------------------------------
    | Consecutive Multi-Day Booking Limit
    |--------------------------------------------------------------------------
    */

    'max_duration_days' => 14,

];
