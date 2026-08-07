<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Jobs
|--------------------------------------------------------------------------
|
| These jobs require the Laravel scheduler to run once per minute:
|   * * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
|
| 1. bookings:send-reminders  — hourly; emails users whose approved booking
|    starts within the next 24 hours (each booking is reminded only once).
| 2. bookings:expire-pending  — nightly; auto-rejects pending requests that
|    have been waiting longer than the configured expiry window.
| 3. waitlist:expire          — hourly; cleans up waitlist entries whose slot
|    has already passed.
*/

Schedule::command('bookings:send-reminders')->hourly();
Schedule::command('bookings:expire-pending')->dailyAt('00:30');
Schedule::command('waitlist:expire')->hourly();
