<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Models\Booking;
use App\Enums\BookingStatus;
use App\Enums\UserRole;
use Carbon\Carbon;
use Tests\TestCase;

class ReportTest extends TestCase
{
    private User $superAdmin;
    private User $normalUser;
    private Location $location;
    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $this->location = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);
        $this->room = Room::factory()->create(['location_id' => $this->location->id, 'name' => 'Testing Room']);
        $this->superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->normalUser = User::factory()->create(['role' => UserRole::User]);
    }

    /**
     * Test utilization report access control.
     */
    public function test_only_admin_can_access_utilization_report(): void
    {
        $this->actingAs($this->normalUser)
            ->getJson("/api/admin/reports/utilization?start_date=" . today()->toDateString() . "&end_date=" . today()->toDateString())
            ->assertStatus(403);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/admin/reports/utilization?start_date=" . today()->toDateString() . "&end_date=" . today()->toDateString())
            ->assertStatus(200);
    }

    /**
     * Test utilization report calculation.
     */
    public function test_utilization_report_computes_correctly(): void
    {
        // Generate an approved booking for today from 10:00 AM to 12:00 PM (2 hours)
        $start = today()->setTime(10, 0, 0);
        $end = today()->setTime(12, 0, 0);

        Booking::factory()->create([
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson("/api/admin/reports/utilization?start_date=" . today()->toDateString() . "&end_date=" . today()->toDateString());

        $response->assertStatus(200)
            ->assertJsonPath('rooms.0.room', 'Testing Room')
            ->assertJsonPath('rooms.0.booked_hours', 2);
    }

    /**
     * Test peak hours report calculations.
     */
    public function test_peak_hours_report_computes_correctly(): void
    {
        // Approved booking from 10:00 AM to 12:00 PM (hour 10 and 11 booked)
        $start = today()->setTime(10, 0, 0);
        $end = today()->setTime(12, 0, 0);

        Booking::factory()->create([
            'room_id' => $this->room->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson("/api/admin/reports/peak-hours?start_date=" . today()->toDateString() . "&end_date=" . today()->toDateString());

        $response->assertStatus(200);
        
        $data = $response->json();
        
        // Find hour 10:00
        $hour10 = collect($data)->firstWhere('hour', '10:00');
        $this->assertEquals(1, $hour10['booking_count']);

        // Find hour 12:00 (since booking ends at 12:00, hour 12 itself is not booked)
        $hour12 = collect($data)->firstWhere('hour', '12:00');
        $this->assertEquals(0, $hour12['booking_count']);
    }
}
