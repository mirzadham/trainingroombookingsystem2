<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\RoomBlackout;
use App\Models\User;
use App\Notifications\BookingStatusChangedNotification;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminBookingTest extends TestCase
{
    private User $superAdmin;

    private User $tpmAdmin;

    private User $khtpAdmin;

    private Location $tpm;

    private Location $khtp;

    private Room $tpmRoom;

    private Room $khtpRoom;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tpm = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);
        $this->khtp = Location::create(['name' => 'Kulim Hi-Tech Park', 'code' => 'KHTP', 'address' => 'Kedah']);

        $this->tpmRoom = Room::factory()->create(['location_id' => $this->tpm->id, 'capacity' => 10]);
        $this->khtpRoom = Room::factory()->create(['location_id' => $this->khtp->id, 'capacity' => 15]);

        $this->superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->tpmAdmin = User::factory()->create([
            'role' => UserRole::LocationAdmin,
            'location_id' => $this->tpm->id,
        ]);
        $this->khtpAdmin = User::factory()->create([
            'role' => UserRole::LocationAdmin,
            'location_id' => $this->khtp->id,
        ]);
    }

    /**
     * Test admin bookings list scoping.
     */
    public function test_admin_bookings_scoping(): void
    {
        Booking::factory()->create(['room_id' => $this->tpmRoom->id, 'title' => 'TPM Event']);
        Booking::factory()->create(['room_id' => $this->khtpRoom->id, 'title' => 'KHTP Event']);

        // TPM Admin sees only TPM bookings
        $response = $this->actingAs($this->tpmAdmin)
            ->getJson('/api/admin/bookings');

        $response->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonFragment(['title' => 'TPM Event'])
            ->assertJsonMissing(['title' => 'KHTP Event']);

        // Super Admin sees all bookings
        $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/bookings')
            ->assertStatus(200)
            ->assertJsonPath('total', 2);
    }

    /**
     * Test single booking approval.
     */
    public function test_booking_approval(): void
    {
        Notification::fake();

        $booking = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'status' => BookingStatus::Pending,
        ]);

        $response = $this->actingAs($this->tpmAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/approve");

        $response->assertStatus(200);
        $this->assertEquals(BookingStatus::Approved, $booking->fresh()->status);
        $this->assertEquals($this->tpmAdmin->id, $booking->fresh()->approved_by);

        // Check Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'booking_id' => $booking->id,
            'user_id' => $this->tpmAdmin->id,
            'action' => 'approved',
        ]);

        Notification::assertSentTo($booking->user, BookingStatusChangedNotification::class);
    }

    /**
     * Test approval concurrency conflict.
     */
    public function test_booking_approval_concurrency_conflict(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $booking1 = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Pending,
        ]);

        $booking2 = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Pending,
        ]);

        // Approve booking 1
        $this->actingAs($this->tpmAdmin)
            ->postJson("/api/admin/bookings/{$booking1->id}/approve")
            ->assertStatus(200);

        // Try to approve booking 2 (should fail due to overlap conflict check)
        $response = $this->actingAs($this->tpmAdmin)
            ->postJson("/api/admin/bookings/{$booking2->id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['conflict']);
    }

    /**
     * Test booking rejection.
     */
    public function test_booking_rejection(): void
    {
        Notification::fake();

        $booking = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'status' => BookingStatus::Pending,
        ]);

        $response = $this->actingAs($this->tpmAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/reject", [
                'reason' => 'Invalid department name.',
            ]);

        $response->assertStatus(200);
        $booking->refresh();
        $this->assertEquals(BookingStatus::Rejected, $booking->status);
        $this->assertEquals('Invalid department name.', $booking->rejection_reason);

        Notification::assertSentTo($booking->user, BookingStatusChangedNotification::class);
    }

    /**
     * Test booking cancellation by admin.
     */
    public function test_booking_cancellation_by_admin(): void
    {
        Notification::fake();

        $booking = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'status' => BookingStatus::Approved,
        ]);

        $response = $this->actingAs($this->tpmAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/cancel", [
                'remarks' => 'Emergency maintenance works.',
            ]);

        $response->assertStatus(200);
        $booking->refresh();
        $this->assertEquals(BookingStatus::Cancelled, $booking->status);
        $this->assertEquals('Emergency maintenance works.', $booking->cancellation_reason);

        Notification::assertSentTo($booking->user, BookingStatusChangedNotification::class);
    }

    /**
     * Test admin booking edit and conflict prevention.
     */
    public function test_admin_booking_edit_availability_check(): void
    {
        $start1 = now()->addDays(2)->setTime(10, 0, 0);
        $end1 = $start1->copy()->addHours(2);

        $start2 = now()->addDays(2)->setTime(13, 0, 0);
        $end2 = $start2->copy()->addHours(2);

        $booking1 = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'start_time' => $start1,
            'end_time' => $end1,
            'status' => BookingStatus::Approved,
        ]);

        $booking2 = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'start_time' => $start2,
            'end_time' => $end2,
            'status' => BookingStatus::Approved,
        ]);

        // Attempt to edit booking 2 to overlap booking 1
        $response = $this->actingAs($this->tpmAdmin)
            ->putJson("/api/admin/bookings/{$booking2->id}", [
                'start_time' => $start1->toDateTimeString(),
                'end_time' => $end1->toDateTimeString(),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['conflict']);
    }

    /**
     * Test batch approval.
     */
    public function test_batch_approval(): void
    {
        $booking1 = Booking::factory()->create(['room_id' => $this->tpmRoom->id, 'status' => BookingStatus::Pending]);

        $start2 = now()->addDays(2)->setTime(13, 0, 0);
        $end2 = $start2->copy()->addHours(2);
        $booking2 = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'status' => BookingStatus::Pending,
            'start_time' => $start2,
            'end_time' => $end2,
        ]);

        $response = $this->actingAs($this->tpmAdmin)
            ->postJson('/api/admin/bookings/batch-approve', [
                'ids' => [$booking1->id, $booking2->id],
            ]);

        $response->assertStatus(200)
            ->assertJsonCount(2, 'results.success');

        $this->assertEquals(BookingStatus::Approved, $booking1->fresh()->status);
        $this->assertEquals(BookingStatus::Approved, $booking2->fresh()->status);
    }

    /**
     * Test admin-created booking for guest.
     */
    public function test_admin_can_create_booking_for_guest(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $response = $this->actingAs($this->tpmAdmin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->tpmRoom->id,
                'title' => 'VIP Visit',
                'start_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'booker_type' => 'guest',
                'guest_name' => 'Dr. Lim',
                'guest_email' => 'dr.lim@guest.com',
                'guest_phone' => '+60111222333',
            ]);

        $response->assertStatus(201);

        // Verify account was auto-created
        $this->assertDatabaseHas('users', [
            'email' => 'dr.lim@guest.com',
            'role' => 'user',
            'user_type' => 'external',
        ]);

        $user = User::where('email', 'dr.lim@guest.com')->first();

        $this->assertDatabaseHas('bookings', [
            'user_id' => $user->id,
            'room_id' => $this->tpmRoom->id,
            'status' => 'approved', // Admin created bookings are auto-approved
        ]);
    }

    /**
     * Test that an admin cannot create an approved booking overlapping an
     * existing one — the row-locked conflict check must reject it.
     */
    public function test_admin_cannot_create_overlapping_booking(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        // First admin-created booking (auto-approved)
        $this->actingAs($this->tpmAdmin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->tpmRoom->id,
                'title' => 'Morning Session',
                'start_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'booker_type' => 'registered',
                'user_id' => $this->tpmAdmin->id,
            ])
            ->assertStatus(201);

        // Overlapping admin-created booking must be rejected
        $this->actingAs($this->tpmAdmin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->tpmRoom->id,
                'title' => 'Overlapping Session',
                'start_date' => $start->toDateString(),
                'start_time' => $start->copy()->addHour()->toDateTimeString(),
                'end_time' => $end->copy()->addHour()->toDateTimeString(),
                'attendees' => 5,
                'booker_type' => 'registered',
                'user_id' => $this->tpmAdmin->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['time']);

        $this->assertDatabaseCount('bookings', 1);
    }

    /**
     * Test admin bypass validation.
     */
    public function test_admin_can_bypass_validations(): void
    {
        // Operating hours are 7 AM to 7 PM.
        // We create a booking at 11:00 PM (normally invalid operating hours, and past)
        $start = now()->addDays(2)->setTime(23, 0, 0);
        $end = $start->copy()->addHours(1);

        // 1. Without bypass -> fails
        $response = $this->actingAs($this->tpmAdmin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->tpmRoom->id,
                'title' => 'Late Meeting',
                'start_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'booker_type' => 'registered',
                'user_id' => User::factory()->create()->id,
                'bypass_validation' => false,
            ]);

        $response->assertStatus(422);

        // 2. With bypass -> succeeds
        $response2 = $this->actingAs($this->tpmAdmin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->tpmRoom->id,
                'title' => 'Late Meeting Bypassed',
                'start_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'booker_type' => 'registered',
                'user_id' => User::factory()->create()->id,
                'bypass_validation' => true,
            ]);

        $response2->assertStatus(201);
    }

    /**
     * Test admin dashboard stats.
     */
    public function test_admin_dashboard_stats(): void
    {
        Booking::factory()->create(['room_id' => $this->tpmRoom->id, 'status' => BookingStatus::Pending]);
        Booking::factory()->create(['room_id' => $this->tpmRoom->id, 'status' => BookingStatus::Approved, 'start_time' => today()->setTime(10, 0, 0)]);

        $response = $this->actingAs($this->tpmAdmin)
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('stats.pending_count', 1)
            ->assertJsonPath('stats.today_bookings', 1);
    }

    /**
     * Test admin calendar.
     */
    public function test_admin_calendar_events(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => BookingStatus::Approved,
        ]);

        RoomBlackout::create([
            'room_id' => $this->tpmRoom->id,
            'title' => 'Maintenance Work',
            'start_time' => $start->copy()->addDays(1),
            'end_time' => $end->copy()->addDays(1),
            'created_by' => $this->superAdmin->id,
        ]);

        $response = $this->actingAs($this->tpmAdmin)
            ->getJson('/api/admin/calendar?start_date='.now()->toDateString().'&end_date='.now()->addDays(5)->toDateString());

        $response->assertStatus(200)
            ->assertJsonCount(2); // 1 booking and 1 blackout
    }

    /**
     * Test that the pending triage queue is sorted soonest-first by start time,
     * with the oldest request first as the FIFO tiebreak.
     */
    public function test_admin_pending_queue_sorted_soonest_first_fifo(): void
    {
        $soon = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'status' => BookingStatus::Pending,
            'start_time' => now()->addDays(1)->setTime(9, 0, 0),
            'end_time' => now()->addDays(1)->setTime(11, 0, 0),
        ]);
        $later = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'status' => BookingStatus::Pending,
            'start_time' => now()->addDays(3)->setTime(9, 0, 0),
            'end_time' => now()->addDays(3)->setTime(11, 0, 0),
        ]);
        // Same start time as $soon but requested earlier → FIFO puts it first.
        $fifo = Booking::factory()->create([
            'room_id' => $this->tpmRoom->id,
            'status' => BookingStatus::Pending,
            'start_time' => now()->addDays(1)->setTime(9, 0, 0),
            'end_time' => now()->addDays(1)->setTime(11, 0, 0),
        ]);
        $fifo->created_at = now()->subDay();
        $fifo->save();

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/bookings?status=pending');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $fifo->id)
            ->assertJsonPath('data.1.id', $soon->id)
            ->assertJsonPath('data.2.id', $later->id);
    }

    /**
     * Test that the admin bookings response includes per-status counts,
     * scoped to the location admin's own location.
     */
    public function test_admin_bookings_include_scoped_status_counts(): void
    {
        Booking::factory()->create(['room_id' => $this->tpmRoom->id, 'status' => BookingStatus::Pending]);
        Booking::factory()->create(['room_id' => $this->tpmRoom->id, 'status' => BookingStatus::Approved]);
        Booking::factory()->create(['room_id' => $this->tpmRoom->id, 'status' => BookingStatus::Approved]);
        Booking::factory()->create(['room_id' => $this->khtpRoom->id, 'status' => BookingStatus::Pending]);

        // TPM admin only sees TPM counts.
        $this->actingAs($this->tpmAdmin)
            ->getJson('/api/admin/bookings')
            ->assertStatus(200)
            ->assertJsonPath('counts.all', 3)
            ->assertJsonPath('counts.pending', 1)
            ->assertJsonPath('counts.approved', 2)
            ->assertJsonPath('counts.rejected', 0)
            ->assertJsonPath('counts.cancelled', 0);

        // Super admin sees everything.
        $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/bookings')
            ->assertStatus(200)
            ->assertJsonPath('counts.all', 4)
            ->assertJsonPath('counts.pending', 2);
    }
}
