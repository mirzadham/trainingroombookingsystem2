<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SeriesCancelTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $otherUser;

    private User $admin;

    private Room $room;

    private string $groupId;

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
        $this->admin = User::factory()->create(['role' => UserRole::SuperAdmin]);

        $this->groupId = Str::uuid()->toString();
    }

    /**
     * Create a 3-week recurring series for the given user, starting in 2 days.
     */
    private function createSeries(User $owner, array $statuses = []): array
    {
        $bookings = [];

        for ($i = 0; $i < 3; $i++) {
            $start = now()->addDays(2 + ($i * 7))->setTime(10, 0, 0);
            $end = $start->copy()->addHours(2);

            $bookings[] = Booking::factory()->create([
                'user_id' => $owner->id,
                'room_id' => $this->room->id,
                'start_time' => $start,
                'end_time' => $end,
                'status' => $statuses[$i] ?? BookingStatus::Pending,
                'recurrence_group_id' => $this->groupId,
            ]);
        }

        return $bookings;
    }

    /**
     * Test that a user can cancel their entire series.
     */
    public function test_user_can_cancel_entire_series(): void
    {
        [$first, $second, $third] = $this->createSeries($this->user);

        $this->actingAs($this->user)
            ->postJson("/api/bookings/{$first->id}/cancel-series", ['future_only' => false])
            ->assertStatus(200)
            ->assertJsonPath('cancelled.2.id', $third->id);

        $this->assertEquals(BookingStatus::Cancelled, $first->fresh()->status);
        $this->assertEquals(BookingStatus::Cancelled, $second->fresh()->status);
        $this->assertEquals(BookingStatus::Cancelled, $third->fresh()->status);
    }

    /**
     * Test that the default behaviour cancels this instance and future ones only.
     */
    public function test_series_cancel_defaults_to_future_only(): void
    {
        [$first, $second, $third] = $this->createSeries($this->user);

        // Cancel from the 2nd occurrence onwards
        $this->actingAs($this->user)
            ->postJson("/api/bookings/{$second->id}/cancel-series")
            ->assertStatus(200)
            ->assertJsonCount(2, 'cancelled');

        $this->assertEquals(BookingStatus::Pending, $first->fresh()->status);
        $this->assertEquals(BookingStatus::Cancelled, $second->fresh()->status);
        $this->assertEquals(BookingStatus::Cancelled, $third->fresh()->status);
    }

    /**
     * Test that a non-owner cannot cancel someone else's series.
     */
    public function test_non_owner_cannot_cancel_series(): void
    {
        [$first] = $this->createSeries($this->user);

        $this->actingAs($this->otherUser)
            ->postJson("/api/bookings/{$first->id}/cancel-series")
            ->assertStatus(403);

        $this->assertEquals(BookingStatus::Pending, $first->fresh()->status);
    }

    /**
     * Test that an admin can cancel a user's series.
     */
    public function test_admin_can_cancel_series(): void
    {
        [$first, $second, $third] = $this->createSeries($this->user, [
            BookingStatus::Pending,
            BookingStatus::Approved,
            BookingStatus::Approved,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/bookings/{$first->id}/cancel-series", [
                'future_only' => false,
                'remarks' => 'Room maintenance',
            ])
            ->assertStatus(200)
            ->assertJsonCount(3, 'cancelled');

        $this->assertEquals(BookingStatus::Cancelled, $second->fresh()->status);
        $this->assertEquals('Room maintenance', $second->fresh()->cancellation_reason);
    }

    /**
     * Test that already-cancelled occurrences are not touched again.
     */
    public function test_cancelled_occurrences_are_skipped(): void
    {
        [$first, $second, $third] = $this->createSeries($this->user, [
            BookingStatus::Pending,
            BookingStatus::Cancelled,
            BookingStatus::Approved,
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/bookings/{$first->id}/cancel-series", ['future_only' => false])
            ->assertStatus(200)
            ->assertJsonCount(2, 'cancelled');

        $this->assertEquals(BookingStatus::Cancelled, $first->fresh()->status);
        $this->assertEquals(BookingStatus::Cancelled, $second->fresh()->status);
        $this->assertEquals(BookingStatus::Cancelled, $third->fresh()->status);
    }

    /**
     * Test that a non-recurring booking falls back to a single cancellation.
     */
    public function test_single_booking_cancel_via_series_endpoint(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Pending,
            'recurrence_group_id' => null,
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/bookings/{$booking->id}/cancel-series")
            ->assertStatus(200)
            ->assertJsonCount(1, 'cancelled');

        $this->assertEquals(BookingStatus::Cancelled, $booking->fresh()->status);
    }

    /**
     * Test that the admin series endpoint on a NON-recurring booking only
     * cancels that booking (and never touches other standalone bookings).
     */
    public function test_admin_series_cancel_on_single_booking_is_scoped(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);

        $target = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => BookingStatus::Pending,
            'recurrence_group_id' => null,
        ]);

        // Unrelated standalone bookings that must NOT be touched
        $other1 = Booking::factory()->create([
            'user_id' => $this->otherUser->id,
            'room_id' => $this->room->id,
            'start_time' => $start->copy()->addDays(1),
            'end_time' => $start->copy()->addDays(1)->addHours(2),
            'status' => BookingStatus::Pending,
            'recurrence_group_id' => null,
        ]);

        $other2 = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start->copy()->addDays(2),
            'end_time' => $start->copy()->addDays(2)->addHours(2),
            'status' => BookingStatus::Approved,
            'recurrence_group_id' => null,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/bookings/{$target->id}/cancel-series", [
                'future_only' => false,
                'remarks' => 'Cleanup',
            ])
            ->assertStatus(200)
            ->assertJsonCount(1, 'cancelled');

        $this->assertEquals(BookingStatus::Cancelled, $target->fresh()->status);
        $this->assertEquals(BookingStatus::Pending, $other1->fresh()->status);
        $this->assertEquals(BookingStatus::Approved, $other2->fresh()->status);
    }
}
