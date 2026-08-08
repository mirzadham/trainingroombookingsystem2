<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogPruneTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The prune command must delete only logs older than the retention
     * window and keep everything newer.
     */
    public function test_prune_deletes_only_logs_older_than_retention(): void
    {
        $user = User::factory()->create(['role' => UserRole::User]);
        $booking = Booking::factory()->create(['user_id' => $user->id]);

        AuditLog::create([
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'action' => 'created',
            'created_at' => now()->subDays(400),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'action' => 'approved',
            'created_at' => now()->subDays(30),
        ]);

        $this->artisan('audit-logs:prune')
            ->expectsOutputToContain('Deleted 1 audit log(s) older than 365 days.')
            ->assertSuccessful();

        $this->assertDatabaseMissing('audit_logs', ['action' => 'created']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'approved']);
    }

    /**
     * The retention window must be overridable via --days.
     */
    public function test_prune_honours_custom_retention_window(): void
    {
        $user = User::factory()->create(['role' => UserRole::User]);
        $booking = Booking::factory()->create(['user_id' => $user->id]);

        AuditLog::create([
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'action' => 'updated',
            'created_at' => now()->subDays(90),
        ]);

        $this->artisan('audit-logs:prune', ['--days' => 30])
            ->expectsOutputToContain('Deleted 1 audit log(s) older than 30 days.')
            ->assertSuccessful();

        $this->assertDatabaseMissing('audit_logs', ['action' => 'updated']);
    }
}
