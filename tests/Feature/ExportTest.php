<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $normalUser;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $location = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);

        $this->room = Room::factory()->create([
            'location_id' => $location->id,
            'capacity' => 20,
            'is_active' => true,
        ]);

        $this->superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->normalUser = User::factory()->create(['role' => UserRole::User]);
    }

    /**
     * Test that only admins can export bookings.
     */
    public function test_export_requires_admin(): void
    {
        $this->actingAs($this->normalUser)
            ->getJson('/api/admin/bookings/export')
            ->assertStatus(403);

        $this->actingAs($this->normalUser)
            ->getJson('/api/admin/audit-logs/export')
            ->assertStatus(403);
    }

    /**
     * Test the bookings CSV export includes the expected rows and columns.
     */
    public function test_bookings_export_contains_data(): void
    {
        $user = User::factory()->create(['role' => UserRole::User]);

        $booking = Booking::factory()->create([
            'user_id' => $user->id,
            'room_id' => $this->room->id,
            'title' => 'Export Me Please',
            'start_time' => now()->addDays(2)->setTime(10, 0, 0),
            'end_time' => now()->addDays(2)->setTime(12, 0, 0),
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/bookings/export')
            ->assertOk();

        $content = $response->streamedContent();

        $this->assertStringContainsString('Reference,Title,Status', $content);
        $this->assertStringContainsString($booking->reference_no, $content);
        $this->assertStringContainsString('Export Me Please', $content);
        $this->assertStringContainsString('approved', $content);
    }

    /**
     * Test that export honours the status filter.
     */
    public function test_bookings_export_respects_filters(): void
    {
        $user = User::factory()->create(['role' => UserRole::User]);

        Booking::factory()->create([
            'user_id' => $user->id,
            'room_id' => $this->room->id,
            'title' => 'Pending One',
            'start_time' => now()->addDays(2)->setTime(10, 0, 0),
            'end_time' => now()->addDays(2)->setTime(12, 0, 0),
            'status' => BookingStatus::Pending,
        ]);

        Booking::factory()->create([
            'user_id' => $user->id,
            'room_id' => $this->room->id,
            'title' => 'Approved One',
            'start_time' => now()->addDays(3)->setTime(10, 0, 0),
            'end_time' => now()->addDays(3)->setTime(12, 0, 0),
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/bookings/export?status=approved')
            ->assertOk();

        $content = $response->streamedContent();

        $this->assertStringContainsString('Approved One', $content);
        $this->assertStringNotContainsString('Pending One', $content);
    }

    /**
     * Test the audit logs CSV export.
     */
    public function test_audit_logs_export_contains_data(): void
    {
        $user = User::factory()->create(['role' => UserRole::User]);

        $booking = Booking::factory()->create([
            'user_id' => $user->id,
            'room_id' => $this->room->id,
            'title' => 'Audited Booking',
            'start_time' => now()->addDays(2)->setTime(10, 0, 0),
            'end_time' => now()->addDays(2)->setTime(12, 0, 0),
            'status' => BookingStatus::Pending,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'action' => 'created',
            'changes' => ['note' => 'test'],
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/audit-logs/export')
            ->assertOk();

        $content = $response->streamedContent();

        $this->assertStringContainsString('"Created At",Action,User', $content);
        $this->assertStringContainsString('created', $content);
        $this->assertStringContainsString('Audited Booking', $content);
    }

    /**
     * Test that the bookings CSV export honours the same ordering as the list:
     * a pending export is a soonest-first triage queue.
     */
    public function test_bookings_export_pending_queue_is_soonest_first(): void
    {
        $later = Booking::factory()->create([
            'user_id' => $this->normalUser->id,
            'room_id' => $this->room->id,
            'title' => 'Later Event',
            'status' => BookingStatus::Pending,
            'start_time' => now()->addDays(5)->setTime(14, 0, 0),
            'end_time' => now()->addDays(5)->setTime(16, 0, 0),
        ]);
        $soon = Booking::factory()->create([
            'user_id' => $this->normalUser->id,
            'room_id' => $this->room->id,
            'title' => 'Soon Event',
            'status' => BookingStatus::Pending,
            'start_time' => now()->addDays(1)->setTime(9, 0, 0),
            'end_time' => now()->addDays(1)->setTime(11, 0, 0),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/bookings/export?status=pending')
            ->assertOk();

        $lines = array_values(array_filter(array_map('trim', explode("\n", $response->streamedContent()))));

        $this->assertCount(3, $lines); // header + 2 data rows
        $this->assertStringStartsWith($soon->reference_no, $lines[1]);
        $this->assertStringStartsWith($later->reference_no, $lines[2]);
    }
}
