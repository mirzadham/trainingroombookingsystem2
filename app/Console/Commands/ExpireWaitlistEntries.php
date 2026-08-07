<?php

namespace App\Console\Commands;

use App\Services\WaitlistService;
use Illuminate\Console\Command;

class ExpireWaitlistEntries extends Command
{
    protected $signature = 'waitlist:expire';

    protected $description = 'Mark waitlist entries whose time slot has passed as expired';

    public function handle(WaitlistService $waitlistService): int
    {
        $expired = $waitlistService->expirePastEntries();

        $this->info("Expired {$expired} stale waitlist entr(ies).");

        return self::SUCCESS;
    }
}
