<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Tests\TestCase;

class AdminCalendarTest extends TestCase
{
    private User $superAdmin;

    private Location $location;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $this->location = Location::create([
            'name' => 'Technology Park Malaysia',
            'code' => 'TPM',
            'address' => 'Level 3, Block A, TPM',
        ]);

        $this->room = Room::factory()->create([
            'location_id' => $this->location->id,
            'capacity' => 10,
        ]);

        $this->superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
    }

    /**
     * Test that calendar booking events expose every field the BookingDetailsModal
     * needs: start_time/end_time aliases, reference_no, and the nested room object
     * (with location name + address) — alongside the flat grid fields.
     */
    public function test_calendar_events_include_modal_compatible_fields(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $booking = Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $this->superAdmin->id,
            'title' => 'Boardroom Training',
            'description' => 'Quarterly planning session.',
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'attendees' => 8,
            'phone' => '+60123456789',
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/calendar?'.http_build_query([
                'start_date' => $start->copy()->subDay()->toDateString(),
                'end_date' => $start->copy()->addDay()->toDateString(),
            ]));

        $response->assertOk();

        $event = collect($response->json())
            ->firstWhere('id', $booking->id);

        $this->assertNotNull($event, 'Booking event not found in calendar response.');

        // Grid fields (existing calendar contract)
        $this->assertSame($booking->start_time->toIso8601String(), $event['start']);
        $this->assertSame($booking->end_time->toIso8601String(), $event['end']);
        $this->assertSame($this->room->name, $event['room']);
        $this->assertSame($this->location->code, $event['location']);
        $this->assertSame('booking', $event['type']);

        // Modal-compatible fields
        $this->assertSame($booking->start_time->toIso8601String(), $event['start_time']);
        $this->assertSame($booking->end_time->toIso8601String(), $event['end_time']);
        $this->assertSame($booking->reference_no, $event['reference_no']);
        $this->assertNull($event['recurrence_group_id']);
        $this->assertSame($this->room->name, $event['room_relation']['name']);
        $this->assertSame($this->location->name, $event['room_relation']['location']['name']);
        $this->assertSame($this->location->address, $event['room_relation']['location']['address']);
        $this->assertSame($booking->description, $event['description']);
        $this->assertSame(8, $event['attendees']);
        $this->assertSame($this->superAdmin->name, $event['user']['name']);
        $this->assertSame($this->superAdmin->email, $event['user']['email']);
    }

    /**
     * Test that multi-day series bookings are returned as separate events,
     * each carrying its own group_id and reference.
     */
    public function test_calendar_events_expose_group_id_for_series(): void
    {
        $start = now()->addDays(3)->setTime(9, 0, 0);
        $groupId = 'test-group-uuid';

        Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $this->superAdmin->id,
            'title' => 'Week-long Course',
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(4),
            'group_id' => $groupId,
            'status' => BookingStatus::Approved,
        ]);
        Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $this->superAdmin->id,
            'title' => 'Week-long Course',
            'start_time' => $start->copy()->addDay(),
            'end_time' => $start->copy()->addDay()->addHours(4),
            'group_id' => $groupId,
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/calendar?'.http_build_query([
                'start_date' => $start->toDateString(),
                'end_date' => $start->copy()->addDay()->toDateString(),
            ]));

        $response->assertOk();

        $events = collect($response->json())
            ->where('type', 'booking')
            ->where('group_id', $groupId)
            ->values();

        $this->assertCount(2, $events);
        $this->assertTrue($events->every(fn ($e) => ! empty($e['reference_no'])));
        $this->assertTrue($events->every(fn ($e) => ! empty($e['start_time']) && ! empty($e['end_time'])));
        $this->assertSame($this->room->name, $events[0]['room_relation']['name']);
    }
}
