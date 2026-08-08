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
    'max_duration_minutes' => 720,  // 12 hours (single-day / standard booking)
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

    /*
    |--------------------------------------------------------------------------
    | Pending Request Expiry
    |--------------------------------------------------------------------------
    */

    // Pending bookings unanswered for this many days are auto-rejected.
    'pending_expiry_days' => env('BOOKING_PENDING_EXPIRY_DAYS', 7),

    /*
    |--------------------------------------------------------------------------
    | Booking Reminders
    |--------------------------------------------------------------------------
    */

    // Reminders are sent for approved bookings starting within this window.
    'reminder_window_hours' => env('BOOKING_REMINDER_WINDOW_HOURS', 24),

];
