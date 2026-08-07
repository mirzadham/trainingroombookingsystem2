<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceTest extends TestCase
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

    private function makeBooking(array $overrides = []): Booking
    {
        $start = now()->subDay()->setTime(10, 0, 0); // started yesterday

        return Booking::factory()->create(array_merge([
            'user_id' => $this->normalUser->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Approved,
        ], $overrides));
    }

    /**
     * Test that an admin can mark a booking as attended.
     */
    public function test_admin_can_mark_booking_attended(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'attended'])
            ->assertStatus(200)
            ->assertJsonPath('booking.attendance_status', 'attended');

        $booking->refresh();
        $this->assertEquals('attended', $booking->attendance_status);
        $this->assertEquals($this->superAdmin->id, $booking->attendance_marked_by);
        $this->assertNotNull($booking->attendance_marked_at);

        // Audit trail written
        $this->assertDatabaseHas('audit_logs', [
            'booking_id' => $booking->id,
            'action' => 'attendance_marked',
        ]);
    }

    /**
     * Test that marking no-show notifies the requester in-app.
     */
    public function test_no_show_creates_in_app_notification(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'no_show'])
            ->assertStatus(200);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->normalUser->id,
            'booking_id' => $booking->id,
            'type' => 'no_show',
        ]);
    }

    /**
     * Test that attendance can be re-marked (latest mark wins).
     */
    public function test_attendance_can_be_re_marked(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'no_show'])
            ->assertStatus(200);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'attended'])
            ->assertStatus(200)
            ->assertJsonPath('booking.attendance_status', 'attended');

        $this->assertDatabaseHas('audit_logs', [
            'booking_id' => $booking->id,
            'action' => 'attendance_marked',
        ]);
    }

    /**
     * Test that non-admins cannot mark attendance.
     */
    public function test_non_admin_cannot_mark_attendance(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($this->normalUser)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'attended'])
            ->assertStatus(403);

        $this->assertNull($booking->fresh()->attendance_status);
    }

    /**
     * Test that invalid attendance statuses are rejected.
     */
    public function test_invalid_attendance_status_rejected(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'maybe'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /**
     * Test that non-approved bookings cannot be marked.
     */
    public function test_pending_booking_cannot_be_marked(): void
    {
        $booking = $this->makeBooking(['status' => BookingStatus::Pending]);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'attended'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->assertNull($booking->fresh()->attendance_status);
    }

    /**
     * Test that future bookings cannot be marked.
     */
    public function test_future_booking_cannot_be_marked(): void
    {
        $booking = $this->makeBooking(['start_time' => now()->addDays(2)->setTime(10, 0, 0)]);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/attendance", ['status' => 'attended'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);

        $this->assertNull($booking->fresh()->attendance_status);
    }

    /**
     * Test that the CSV export includes the attendance column.
     */
    public function test_export_includes_attendance_column(): void
    {
        $booking = $this->makeBooking(['attendance_status' => 'no_show']);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/bookings/export')
            ->assertOk();

        $content = $response->streamedContent();

        $this->assertStringContainsString('Attendance', $content);
        $this->assertStringContainsString('no_show', $content);
        $this->assertStringContainsString($booking->reference_no, $content);
    }
}
