<?php

namespace App\Console\Commands;

use App\Services\ReminderService;
use Illuminate\Console\Command;

class SendBookingReminders extends Command
{
    protected $signature = 'bookings:send-reminders {--hours=24 : Reminder window (hours before booking start)}';

    protected $description = 'Send email + in-app reminders for approved bookings starting within the next N hours';

    public function handle(ReminderService $reminderService): int
    {
        $hours = (int) $this->option('hours');

        $sent = $reminderService->sendUpcomingReminders($hours);

        $this->info("Sent {$sent} booking reminder(s).");

        return self::SUCCESS;
    }
}
