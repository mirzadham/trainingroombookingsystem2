<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Http\Request;

class AuditService
{
    /**
     * Log an audit event.
     */
    public function log(User $user, Booking $booking, string $action, ?array $changes = null): AuditLog
    {
        return AuditLog::create([
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'action' => $action,
            'changes' => $changes,
            'ip_address' => request()?->ip(),
            'created_at' => now(),
        ]);
    }
}
