<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Models\Booking;
use App\Models\RoomBlackout;
use App\Enums\BookingStatus;
use App\Enums\UserRole;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;
use App\Notifications\BookingStatusChangedNotification;
use Tests\TestCase;

class BookingTest extends TestCase
{
    private User $user;
    private Room $room;
    private Location $location;

    protected function setUp(): void
    {
        parent::setUp();

        $this->location = Location::create([
            'name' => 'Technology Park Malaysia',
            'code' => 'TPM',
            'address' => 'Kuala Lumpur',
        ]);

        $this->room = Room::factory()->create([
            'location_id' => $this->location->id,
            'capacity' => 15,
            'is_active' => true,
        ]);

        $this->user = User::factory()->create([
            'role' => UserRole::User,
        ]);
    }

    /**
     * Test successful single-day booking creation.
     */
    public function test_user_can_create_single_day_booking(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Project Kickoff',
                'description' => 'Planning session',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 10,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('bookings', [
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'title' => 'Project Kickoff',
            'status' => 'pending',
        ]);

        Notification::assertSentTo($this->user, BookingStatusChangedNotification::class);
    }

    /**
     * Test operating hours validations.
     */
    public function test_booking_validation_outside_operating_hours(): void
    {
        // Operating hours are 7 AM to 7 PM
        $start = now()->addDays(2)->setTime(6, 0, 0); // 6 AM
        $end = $start->copy()->addHours(1);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Early Meeting',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['time']);
    }

    /**
     * Test duration limits.
     */
    public function test_booking_validation_duration_limits(): void
    {
        // 1. Min duration is 30 mins
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addMinutes(15);

        $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Short Meet',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['duration']);

        // 2. Max duration is 8 hours (480 mins)
        $end = $start->copy()->addHours(9);
        $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Long Meet',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['duration']);
    }

    /**
     * Test same day advance minutes validation.
     */
    public function test_booking_validation_same_day_advance(): void
    {
        config(['booking.same_day_advance_minutes' => 60]);

        $start = now()->addMinutes(30); // 30 minutes from now (must be >= 60)
        $end = $start->copy()->addMinutes(30);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Urgent Meeting',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }

    /**
     * Test cannot book in the past.
     */
    public function test_booking_cannot_be_in_the_past(): void
    {
        $start = now()->subDays(1)->setTime(10, 0, 0); // Yesterday
        $end = $start->copy()->addHours(1);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Past Meeting',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }

    /**
     * Test attendees cannot exceed capacity.
     */
    public function test_booking_validation_exceeds_room_capacity(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(1);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Large Meeting',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 20, // Capacity is 15
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attendees']);
    }

    /**
     * Test duplicate booking prevention.
     */
    public function test_booking_validation_duplicate_prevented(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(1);

        // Pre-create an active booking for this user (using local time)
        Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Pending,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Overlapping Meeting',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['duplicate']);
    }

    /**
     * Test blackout overlap prevention.
     */
    public function test_booking_validation_blackout_overlap(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        // Pre-create a blackout overlapping the booking range (using local time)
        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Renovation',
            'start_time' => $start->copy()->subMinutes(30),
            'end_time' => $start->copy()->addMinutes(30),
            'created_by' => User::factory()->create(['role' => UserRole::SuperAdmin])->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Renovation Overlap',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['blackout']);
    }

    /**
     * Test update booking.
     */
    public function test_user_can_update_pending_booking(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(1);

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'status' => BookingStatus::Pending,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/bookings/{$booking->id}", [
                'room_id' => $this->room->id,
                'title' => 'Updated Title',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 8,
                'phone' => '+60111111111',
            ]);

        $response->assertStatus(200);
        $this->assertEquals('Updated Title', $booking->fresh()->title);
    }

    /**
     * Test cannot update non-pending booking.
     */
    public function test_user_cannot_update_approved_booking(): void
    {
        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/bookings/{$booking->id}", [
                'room_id' => $this->room->id,
                'title' => 'Cant Update Title',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /**
     * Test user cancel booking.
     */
    public function test_user_can_cancel_booking(): void
    {
        Notification::fake();

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/bookings/{$booking->id}/cancel");

        $response->assertStatus(200);
        $this->assertEquals(BookingStatus::Cancelled, $booking->fresh()->status);

        Notification::assertSentTo($this->user, BookingStatusChangedNotification::class);
    }

    /**
     * Test consecutive multi-day bookings.
     */
    public function test_consecutive_multi_day_booking_creation(): void
    {
        $startDate = now()->addDays(2);
        $endDate = $startDate->copy()->addDays(2); // 3 days total (inclusive)

        $startDateTime = $startDate->copy()->setTime(9, 0, 0);
        $endDateTime = $startDate->copy()->setTime(17, 0, 0);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Multi-day Training',
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'start_time' => $startDateTime->toDateTimeString(),
                'end_time' => $endDateTime->toDateTimeString(),
                'attendees' => 8,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(201);
        
        $this->assertDatabaseCount('bookings', 3);
        $bookings = Booking::all();
        $groupIds = $bookings->pluck('group_id')->unique();
        
        $this->assertCount(1, $groupIds); // Shared group_id
        $this->assertNotNull($groupIds->first());
    }

    /**
     * Test transaction atomicity in multi-day booking.
     */
    public function test_multi_day_booking_transaction_atomicity(): void
    {
        $startDate = now()->addDays(2);
        $conflictDate = $startDate->copy()->addDay(); // Day 2
        $endDate = $startDate->copy()->addDays(2);

        // Pre-create an approved booking on the second day causing a conflict
        // (saved in UTC as multi-day logic expects, but wait! Since hasConflict will query it,
        // let's see how hasConflict behaves. We can save it using the same timezone conversion).
        $conflictStart = $conflictDate->copy()->setTime(9, 0, 0);
        $conflictEnd = $conflictDate->copy()->setTime(17, 0, 0);

        Booking::factory()->create([
            'room_id' => $this->room->id,
            'start_time' => $conflictStart,
            'end_time' => $conflictEnd,
            'status' => BookingStatus::Approved,
        ]);

        $startDateTime = $startDate->copy()->setTime(9, 0, 0);
        $endDateTime = $startDate->copy()->setTime(17, 0, 0);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Clashing Multi-day',
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'start_time' => $startDateTime->toDateTimeString(),
                'end_time' => $endDateTime->toDateTimeString(),
                'attendees' => 8,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);

        // Since transaction should rollback, no bookings should be created for this request
        // (total bookings count should be 1 - only the pre-existing conflict booking)
        $this->assertDatabaseCount('bookings', 1);
    }

    /**
     * Test recurring bookings.
     */
    public function test_recurring_weekly_booking_creation(): void
    {
        $start = now()->addDays(2)->setTime(14, 0, 0); // 2:00 PM
        $end = $start->copy()->addHours(2);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings/recurring', [
                'room_id' => $this->room->id,
                'title' => 'Weekly Sync',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
                'weeks' => 4, // 4 weeks recurring
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseCount('bookings', 4);

        $bookings = Booking::all();
        $recurrenceGroupIds = $bookings->pluck('recurrence_group_id')->unique();
        $this->assertCount(1, $recurrenceGroupIds);
        $this->assertNotNull($recurrenceGroupIds->first());
    }

    /**
     * Test transaction atomicity in recurring bookings on blackout overlap.
     */
    public function test_recurring_booking_transaction_atomicity_on_blackout(): void
    {
        $start = now()->addDays(2)->setTime(14, 0, 0);
        $end = $start->copy()->addHours(2);
        
        $blackoutWeek = $start->copy()->addWeeks(2); // Clashes on week 3

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Maintenance',
            'start_time' => $blackoutWeek, // Local time
            'end_time' => $blackoutWeek->copy()->addHours(2), // Local time
            'created_by' => User::factory()->create(['role' => UserRole::SuperAdmin])->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings/recurring', [
                'room_id' => $this->room->id,
                'title' => 'Weekly Clashing Sync',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
                'weeks' => 4,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['blackout']);

        // Check rollback: no bookings should exist
        $this->assertDatabaseCount('bookings', 0);
    }
}
