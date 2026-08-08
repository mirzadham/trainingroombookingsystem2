<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use Illuminate\Console\Command;

class PruneAuditLogs extends Command
{
    protected $signature = 'audit-logs:prune {--days=365 : Delete audit logs older than this many days} {--dry-run : Report what would be deleted without deleting}';

    protected $description = 'Delete audit logs older than the retention window (default 365 days)';

    public function handle(): int
    {
        $days = (int) $this->option('days');

        if ($days < 1) {
            $this->error("Retention days must be at least 1 (got {$days}).");

            return self::FAILURE;
        }

        $cutoff = now()->subDays($days);
        $query = AuditLog::query()->where('created_at', '<', $cutoff);

        if ($this->option('dry-run')) {
            $this->info("Would delete {$query->count()} audit log(s) older than {$days} days (dry run).");

            return self::SUCCESS;
        }

        $deleted = $query->delete();

        $this->info("Deleted {$deleted} audit log(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
