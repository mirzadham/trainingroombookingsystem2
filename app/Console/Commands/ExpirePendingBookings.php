<?php

namespace App\Console\Commands;

use App\Services\PendingExpiryService;
use Illuminate\Console\Command;

class ExpirePendingBookings extends Command
{
    protected $signature = 'bookings:expire-pending {--days=7 : Expire pending bookings older than this many days}';

    protected $description = 'Auto-reject pending bookings that were never answered by an administrator';

    public function handle(PendingExpiryService $expiryService): int
    {
        $days = (int) $this->option('days');

        $expired = $expiryService->expirePendingBookings($days);

        $this->info("Expired {$expired} stale pending booking(s).");

        return self::SUCCESS;
    }
}
