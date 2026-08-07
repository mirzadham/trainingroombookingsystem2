<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingCapacityTest extends TestCase
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
            'capacity' => 15,
            'is_active' => true,
        ]);

        $this->user = User::factory()->create(['role' => UserRole::User]);
    }

    /**
     * Test that a booking exceeding the room capacity is rejected at the request layer.
     */
    public function test_booking_over_capacity_is_rejected(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Overflow Meeting',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 16, // capacity is 15
                'phone' => '+60123456789',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['attendees']);

        $this->assertDatabaseCount('bookings', 0);
    }

    /**
     * Test that a booking exactly at capacity is accepted.
     */
    public function test_booking_at_capacity_is_accepted(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Full House',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 15,
                'phone' => '+60123456789',
            ])
            ->assertStatus(201);

        $this->assertDatabaseCount('bookings', 1);
    }

    /**
     * Test that recurring series bookings are also capacity-checked.
     */
    public function test_recurring_booking_over_capacity_is_rejected(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->actingAs($this->user)
            ->postJson('/api/bookings/recurring', [
                'room_id' => $this->room->id,
                'title' => 'Weekly Overflow',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 20,
                'phone' => '+60123456789',
                'weeks' => 4,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['attendees']);

        $this->assertDatabaseCount('bookings', 0);
    }

    /**
     * Test that an admin-created booking over capacity is rejected (even with bypass).
     */
    public function test_admin_booking_over_capacity_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->actingAs($admin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Admin Overflow',
                'start_date' => $start->toDateString(),
                'start_time' => $start->format('H:i'),
                'end_time' => $end->format('H:i'),
                'attendees' => 16,
                'booker_type' => 'registered',
                'user_id' => $this->user->id,
                'bypass_validation' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['attendees']);

        $this->assertDatabaseCount('bookings', 0);
    }
}
