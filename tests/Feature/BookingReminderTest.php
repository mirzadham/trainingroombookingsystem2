<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Notifications\BookingReminderNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BookingReminderTest extends TestCase
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
     * Test that reminders are sent for approved bookings within the window.
     */
    public function test_reminder_sent_for_upcoming_approved_booking(): void
    {
        Notification::fake();

        $start = now()->addHours(3)->setMinute(0)->setSecond(0);

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Approved,
        ]);

        $this->artisan('bookings:send-reminders')
            ->expectsOutputToContain('1 booking reminder')
            ->assertExitCode(0);

        Notification::assertSentTo($this->user, BookingReminderNotification::class);

        $this->assertNotNull($booking->fresh()->reminder_sent_at, 'reminder_sent_at should be recorded');

        // In-app notification record created
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->user->id,
            'booking_id' => $booking->id,
            'type' => 'reminder',
        ]);
    }

    /**
     * Test that a booking is only reminded once.
     */
    public function test_booking_reminded_only_once(): void
    {
        Notification::fake();

        $start = now()->addHours(3)->setMinute(0)->setSecond(0);

        Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Approved,
            'reminder_sent_at' => now(),
        ]);

        $this->artisan('bookings:send-reminders')
            ->expectsOutputToContain('0 booking reminder')
            ->assertExitCode(0);

        Notification::assertNothingSent();
    }

    /**
     * Test that bookings outside the window are not reminded.
     */
    public function test_booking_outside_window_not_reminded(): void
    {
        Notification::fake();

        $start = now()->addDays(3)->setTime(10, 0, 0);

        Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Approved,
        ]);

        $this->artisan('bookings:send-reminders')->assertExitCode(0);

        Notification::assertNothingSent();
        $this->assertNull(Booking::first()->reminder_sent_at);
    }

    /**
     * Test that pending bookings are never reminded.
     */
    public function test_pending_booking_not_reminded(): void
    {
        Notification::fake();

        $start = now()->addHours(3)->setMinute(0)->setSecond(0);

        Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Pending,
        ]);

        $this->artisan('bookings:send-reminders')->assertExitCode(0);

        Notification::assertNothingSent();
    }
}
