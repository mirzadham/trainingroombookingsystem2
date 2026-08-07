<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Notifications\BookingStatusChangedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PendingExpiryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

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

        $this->user = User::factory()->create(['role' => UserRole::User]);
    }

    /**
     * Test that stale pending bookings are auto-rejected with a reason.
     */
    public function test_stale_pending_booking_is_expired(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Pending,
            'created_at' => now()->subDays(10),
        ]);

        $this->artisan('bookings:expire-pending')
            ->expectsOutputToContain('1 stale pending booking')
            ->assertExitCode(0);

        $booking->refresh();

        $this->assertEquals(BookingStatus::Rejected, $booking->status);
        $this->assertStringContainsString('Auto-expired', $booking->rejection_reason);
        $this->assertNull($booking->rejected_by);

        // Audit log written
        $this->assertDatabaseHas('audit_logs', [
            'booking_id' => $booking->id,
            'action' => 'auto_expired',
        ]);

        // User notified (email + in-app)
        Notification::assertSentTo($this->user, BookingStatusChangedNotification::class);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->user->id,
            'booking_id' => $booking->id,
            'type' => 'expired',
        ]);
    }

    /**
     * Test that recent pending bookings are left alone.
     */
    public function test_fresh_pending_booking_not_expired(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Pending,
            'created_at' => now()->subDay(),
        ]);

        $this->artisan('bookings:expire-pending')->assertExitCode(0);

        $this->assertEquals(BookingStatus::Pending, $booking->fresh()->status);
    }

    /**
     * Test that approved bookings are never touched by the expiry job.
     */
    public function test_approved_booking_not_expired(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Approved,
            'created_at' => now()->subDays(30),
        ]);

        $this->artisan('bookings:expire-pending')->assertExitCode(0);

        $this->assertEquals(BookingStatus::Approved, $booking->fresh()->status);
    }

    /**
     * Test that the expiry window is configurable via the command option.
     */
    public function test_expiry_window_option(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);

        // 5 days old — expired with --days=4, kept with --days=10
        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Pending,
            'created_at' => now()->subDays(5),
        ]);

        $this->artisan('bookings:expire-pending', ['--days' => 10])->assertExitCode(0);
        $this->assertEquals(BookingStatus::Pending, $booking->fresh()->status);

        $this->artisan('bookings:expire-pending', ['--days' => 4])->assertExitCode(0);
        $this->assertEquals(BookingStatus::Rejected, $booking->fresh()->status);
    }
}
