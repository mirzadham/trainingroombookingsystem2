<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Models\Booking;
use App\Enums\BookingStatus;
use App\Enums\UserRole;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;
use App\Notifications\BookingStatusChangedNotification;
use Tests\TestCase;

class BookingReferenceTest extends TestCase
{
    private User $user;
    private User $admin;
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

        $this->admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
        ]);
    }

    /**
     * Test single booking reference generation format (MA-XXXXXX).
     */
    public function test_single_booking_generates_valid_reference(): void
    {
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

        $response->assertStatus(201);
        $booking = Booking::first();

        $this->assertNotNull($booking->reference_no);
        $this->assertMatchesRegularExpression('/^MA-[A-Z2-9]{6}$/', $booking->reference_no);
    }

    /**
     * Test multi-day consecutive bookings reference format (MA-XXXXXX-01, MA-XXXXXX-02...).
     */
    public function test_multi_day_booking_generates_sequenced_references(): void
    {
        $startDate = now()->addDays(2);
        $endDate = $startDate->copy()->addDays(2); // 3 days total

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

        $bookings = Booking::orderBy('start_time')->get();
        $this->assertCount(3, $bookings);

        // Verify they share the same base prefix and have correct sequence numbers
        $ref1 = $bookings[0]->reference_no;
        $ref2 = $bookings[1]->reference_no;
        $ref3 = $bookings[2]->reference_no;

        $this->assertMatchesRegularExpression('/^MA-[A-Z2-9]{6}-01$/', $ref1);
        $this->assertMatchesRegularExpression('/^MA-[A-Z2-9]{6}-02$/', $ref2);
        $this->assertMatchesRegularExpression('/^MA-[A-Z2-9]{6}-03$/', $ref3);

        $base1 = substr($ref1, 0, 9); // MA-XXXXXX
        $base2 = substr($ref2, 0, 9);
        $base3 = substr($ref3, 0, 9);

        $this->assertEquals($base1, $base2);
        $this->assertEquals($base1, $base3);
    }

    /**
     * Test recurring weekly bookings reference format.
     */
    public function test_recurring_booking_generates_sequenced_references(): void
    {
        $start = now()->addDays(2)->setTime(14, 0, 0);
        $end = $start->copy()->addHours(2);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings/recurring', [
                'room_id' => $this->room->id,
                'title' => 'Weekly Sync',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
                'weeks' => 2,
            ]);

        $response->assertStatus(201);

        $bookings = Booking::orderBy('start_time')->get();
        $this->assertCount(2, $bookings);

        $ref1 = $bookings[0]->reference_no;
        $ref2 = $bookings[1]->reference_no;

        $this->assertMatchesRegularExpression('/^MA-[A-Z2-9]{6}-01$/', $ref1);
        $this->assertMatchesRegularExpression('/^MA-[A-Z2-9]{6}-02$/', $ref2);

        $base1 = substr($ref1, 0, 9);
        $base2 = substr($ref2, 0, 9);

        $this->assertEquals($base1, $base2);
    }

    /**
     * Test admin can search bookings by reference number.
     */
    public function test_admin_can_search_bookings_by_reference(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'title' => 'Search Target',
            'start_time' => $start,
            'end_time' => $end,
        ]);

        $ref = $booking->reference_no;

        // Search for this reference number
        $response = $this->actingAs($this->admin)
            ->getJson("/api/admin/bookings?search={$ref}");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reference_no', $ref);
    }
}
