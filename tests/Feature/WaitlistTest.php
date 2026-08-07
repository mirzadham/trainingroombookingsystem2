<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\WaitlistAvailableNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $otherUser;

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
        $this->otherUser = User::factory()->create(['role' => UserRole::User]);
    }

    private function makeApprovedBooking(User $owner, Room $room, $start, $end): Booking
    {
        return Booking::factory()->create([
            'user_id' => $owner->id,
            'room_id' => $room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Approved,
        ]);
    }

    /**
     * Test that a user can join the waitlist when the slot is taken.
     */
    public function test_user_can_join_waitlist_for_occupied_slot(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->makeApprovedBooking($this->otherUser, $this->room, $start, $end);

        $this->actingAs($this->user)
            ->postJson('/api/waitlist', [
                'room_id' => $this->room->id,
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('waitlist_entries', [
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'status' => 'active',
        ]);
    }

    /**
     * Test that joining the waitlist for an available slot is rejected.
     */
    public function test_cannot_join_waitlist_for_available_slot(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->actingAs($this->user)
            ->postJson('/api/waitlist', [
                'room_id' => $this->room->id,
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);

        $this->assertDatabaseCount('waitlist_entries', 0);
    }

    /**
     * Test that duplicate waitlist entries for the same slot are rejected.
     */
    public function test_cannot_join_waitlist_twice_for_same_slot(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->makeApprovedBooking($this->otherUser, $this->room, $start, $end);

        $payload = [
            'room_id' => $this->room->id,
            'start_time' => $start->toDateTimeString(),
            'end_time' => $end->toDateTimeString(),
        ];

        $this->actingAs($this->user)->postJson('/api/waitlist', $payload)->assertStatus(201);

        $this->actingAs($this->user)
            ->postJson('/api/waitlist', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['duplicate']);
    }

    /**
     * Test that a user can leave the waitlist but not someone else's entry.
     */
    public function test_leave_waitlist_permissions(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->makeApprovedBooking($this->otherUser, $this->room, $start, $end);

        $entry = WaitlistEntry::create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'active',
        ]);

        // Other user cannot remove it (403, not 422)
        $this->actingAs($this->otherUser)
            ->deleteJson("/api/waitlist/{$entry->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('waitlist_entries', ['id' => $entry->id]);

        // Owner can
        $this->actingAs($this->user)
            ->deleteJson("/api/waitlist/{$entry->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('waitlist_entries', ['id' => $entry->id]);
    }

    /**
     * Test that cancelling an approved booking notifies waitlisted users.
     */
    public function test_cancelling_approved_booking_notifies_waitlist(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $booking = $this->makeApprovedBooking($this->otherUser, $this->room, $start, $end);

        $entry = WaitlistEntry::create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'active',
        ]);

        // Owner cancels the approved booking
        $this->actingAs($this->otherUser)
            ->postJson("/api/bookings/{$booking->id}/cancel")
            ->assertStatus(200);

        // Waitlist entry marked as notified
        $entry->refresh();
        $this->assertEquals('notified', $entry->status->value);
        $this->assertNotNull($entry->notified_at);

        // User notified by email + in-app
        Notification::assertSentTo($this->user, WaitlistAvailableNotification::class);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->user->id,
            'type' => 'waitlist_available',
        ]);
    }

    /**
     * Test that rejecting a PENDING booking does not notify the waitlist
     * (the slot was never approved).
     */
    public function test_rejecting_pending_booking_does_not_notify_waitlist(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $pending = Booking::factory()->create([
            'user_id' => $this->otherUser->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Pending,
        ]);

        WaitlistEntry::create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'active',
        ]);

        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);

        $this->actingAs($admin)
            ->postJson("/api/admin/bookings/{$pending->id}/reject", ['reason' => 'No longer needed'])
            ->assertStatus(200);

        Notification::assertNotSentTo($this->user, WaitlistAvailableNotification::class);

        $this->assertDatabaseHas('waitlist_entries', [
            'user_id' => $this->user->id,
            'status' => 'active',
        ]);
    }

    /**
     * Test that past waitlist entries are expired by the maintenance command.
     */
    public function test_past_waitlist_entries_are_expired(): void
    {
        $start = now()->subDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        WaitlistEntry::create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => 'active',
        ]);

        $this->artisan('waitlist:expire')
            ->expectsOutputToContain('1 stale waitlist')
            ->assertExitCode(0);

        $this->assertDatabaseHas('waitlist_entries', [
            'user_id' => $this->user->id,
            'status' => 'expired',
        ]);
    }

    /**
     * Test that the waitlist join endpoint is rate limited per user.
     */
    public function test_waitlist_join_is_rate_limited(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->makeApprovedBooking($this->otherUser, $this->room, $start, $end);

        $payload = [
            'room_id' => $this->room->id,
            'start_time' => $start->toDateTimeString(),
            'end_time' => $end->toDateTimeString(),
        ];

        // The limiter allows 10 attempts per minute (subsequent attempts hit
        // the duplicate check, but they still count against the throttle).
        for ($i = 0; $i < 10; $i++) {
            $this->actingAs($this->user)->postJson('/api/waitlist', $payload);
        }

        $this->actingAs($this->user)
            ->postJson('/api/waitlist', $payload)
            ->assertStatus(429);
    }

    /**
     * Test that the waitlist list endpoint returns the user's entries.
     */
    public function test_waitlist_index_returns_user_entries(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->makeApprovedBooking($this->otherUser, $this->room, $start, $end);

        $this->actingAs($this->user)->postJson('/api/waitlist', [
            'room_id' => $this->room->id,
            'start_time' => $start->toDateTimeString(),
            'end_time' => $end->toDateTimeString(),
        ])->assertStatus(201);

        $response = $this->actingAs($this->user)
            ->getJson('/api/waitlist')
            ->assertStatus(200);

        $this->assertCount(1, $response->json());
        $this->assertEquals($this->room->name, $response->json()[0]['room']['name']);
    }
}
