<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\AdminInvitation;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\RoomBlackout;
use App\Models\User;
use App\Notifications\AdminNewBookingNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class RoomAdminTest extends TestCase
{
    private User $superAdmin;

    private User $roomAdmin;

    private User $otherRoomAdmin;

    private User $normalUser;

    private Location $tpm;

    private Location $khtp;

    private Room $assignedRoom;

    private Room $otherRoom;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tpm = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);
        $this->khtp = Location::create(['name' => 'Kulim Hi-Tech Park', 'code' => 'KHTP', 'address' => 'Kedah']);

        $this->assignedRoom = Room::factory()->create(['location_id' => $this->tpm->id, 'capacity' => 20]);
        $this->otherRoom = Room::factory()->create(['location_id' => $this->tpm->id, 'capacity' => 20]);

        $this->superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->normalUser = User::factory()->create(['role' => UserRole::User]);

        $this->roomAdmin = User::factory()->create([
            'role' => UserRole::RoomAdmin,
            'location_id' => $this->tpm->id,
        ]);
        $this->roomAdmin->adminRooms()->attach($this->assignedRoom->id);

        $this->otherRoomAdmin = User::factory()->create([
            'role' => UserRole::RoomAdmin,
            'location_id' => $this->tpm->id,
        ]);
        $this->otherRoomAdmin->adminRooms()->attach($this->otherRoom->id);
    }

    // ---------------------------------------------------------
    // Login / scope payload
    // ---------------------------------------------------------

    public function test_room_admin_can_login_and_receives_room_scope(): void
    {
        $response = $this->postJson('/api/auth/admin/login', [
            'email' => $this->roomAdmin->email,
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.role', 'room_admin')
            ->assertJsonPath('user.admin_rooms.0.id', $this->assignedRoom->id);
    }

    public function test_room_admin_reaches_admin_endpoints(): void
    {
        $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/dashboard')
            ->assertStatus(200);
    }

    // ---------------------------------------------------------
    // Bookings list / counts scoping
    // ---------------------------------------------------------

    public function test_room_admin_bookings_list_scoped_to_assigned_rooms(): void
    {
        Booking::factory()->create(['room_id' => $this->assignedRoom->id, 'title' => 'Assigned Event']);
        Booking::factory()->create(['room_id' => $this->otherRoom->id, 'title' => 'Other Event']);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/bookings');

        $response->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('counts.all', 1)
            ->assertJsonPath('counts.pending', 1)
            ->assertJsonFragment(['title' => 'Assigned Event'])
            ->assertJsonMissing(['title' => 'Other Event']);
    }

    // ---------------------------------------------------------
    // Approve / reject / cancel authorization
    // ---------------------------------------------------------

    public function test_room_admin_can_approve_assigned_room_booking(): void
    {
        $booking = Booking::factory()->create(['room_id' => $this->assignedRoom->id, 'status' => BookingStatus::Pending]);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/approve")
            ->assertStatus(200);

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => BookingStatus::Approved->value]);
    }

    public function test_room_admin_cannot_approve_other_room_booking(): void
    {
        $booking = Booking::factory()->create(['room_id' => $this->otherRoom->id, 'status' => BookingStatus::Pending]);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/approve")
            ->assertStatus(403);

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => BookingStatus::Pending->value]);
    }

    public function test_room_admin_cannot_reject_other_room_booking(): void
    {
        $booking = Booking::factory()->create(['room_id' => $this->otherRoom->id, 'status' => BookingStatus::Pending]);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/reject", ['reason' => 'No access'])
            ->assertStatus(403);
    }

    public function test_room_admin_can_cancel_assigned_room_booking(): void
    {
        $booking = Booking::factory()->create(['room_id' => $this->assignedRoom->id, 'status' => BookingStatus::Approved]);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/cancel", ['remarks' => 'Maintenance'])
            ->assertStatus(200);

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => BookingStatus::Cancelled->value]);
    }

    public function test_room_admin_cannot_cancel_other_room_booking(): void
    {
        $booking = Booking::factory()->create(['room_id' => $this->otherRoom->id, 'status' => BookingStatus::Approved]);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/cancel", ['remarks' => 'Nope'])
            ->assertStatus(403);
    }

    // ---------------------------------------------------------
    // Admin-created bookings
    // ---------------------------------------------------------

    public function test_room_admin_cannot_admin_create_booking_in_other_room(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->actingAs($this->roomAdmin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->otherRoom->id,
                'title' => 'Sneaky Booking',
                'start_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'booker_type' => 'registered',
                'user_id' => $this->normalUser->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['authorization']);
    }

    public function test_room_admin_can_admin_create_booking_in_assigned_room(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->actingAs($this->roomAdmin)
            ->postJson('/api/admin/bookings', [
                'room_id' => $this->assignedRoom->id,
                'title' => 'Legit Booking',
                'start_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'booker_type' => 'registered',
                'user_id' => $this->normalUser->id,
            ])
            ->assertStatus(201);
    }

    // ---------------------------------------------------------
    // Dashboard scoping
    // ---------------------------------------------------------

    public function test_room_admin_dashboard_scoped(): void
    {
        Booking::factory()->create(['room_id' => $this->assignedRoom->id, 'status' => BookingStatus::Pending]);
        Booking::factory()->create(['room_id' => $this->otherRoom->id, 'status' => BookingStatus::Pending]);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('stats.pending_count', 1)
            ->assertJsonPath('stats.total_rooms', 1);
    }

    // ---------------------------------------------------------
    // Calendar scoping
    // ---------------------------------------------------------

    public function test_room_admin_calendar_scoped(): void
    {
        $start = now()->addDays(3)->setTime(9, 0, 0);
        $end = $start->copy()->addHours(1);

        Booking::factory()->create([
            'room_id' => $this->assignedRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => $start,
            'end_time' => $end,
            'title' => 'Visible Event',
        ]);
        Booking::factory()->create([
            'room_id' => $this->otherRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => $start->copy()->addDays(1),
            'end_time' => $end->copy()->addDays(1),
            'title' => 'Hidden Event',
        ]);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/calendar?start_date='.$start->toDateString().'&end_date='.$end->addDays(2)->toDateString());

        $response->assertStatus(200)
            ->assertJsonFragment(['title' => 'Visible Event'])
            ->assertJsonMissing(['title' => 'Hidden Event']);
    }

    // ---------------------------------------------------------
    // Blackouts
    // ---------------------------------------------------------

    public function test_room_admin_can_create_blackout_for_assigned_room(): void
    {
        $start = now()->addDays(5)->setTime(8, 0, 0);
        $end = $start->copy()->addHours(3);

        $this->actingAs($this->roomAdmin)
            ->postJson('/api/admin/blackouts', [
                'room_id' => $this->assignedRoom->id,
                'title' => 'Cleaning',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
            ])
            ->assertStatus(201);
    }

    public function test_room_admin_cannot_create_blackout_for_other_room(): void
    {
        $start = now()->addDays(5)->setTime(8, 0, 0);
        $end = $start->copy()->addHours(3);

        $this->actingAs($this->roomAdmin)
            ->postJson('/api/admin/blackouts', [
                'room_id' => $this->otherRoom->id,
                'title' => 'Sneaky Blackout',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['room_id']);
    }

    public function test_room_admin_cannot_delete_blackout_for_other_room(): void
    {
        $blackout = RoomBlackout::create([
            'room_id' => $this->otherRoom->id,
            'title' => 'Other Room Blackout',
            'start_time' => now()->addDays(6)->setTime(8, 0, 0),
            'end_time' => now()->addDays(6)->setTime(10, 0, 0),
            'created_by' => $this->superAdmin->id,
        ]);

        $this->actingAs($this->roomAdmin)
            ->deleteJson("/api/admin/blackouts/{$blackout->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('room_blackouts', ['id' => $blackout->id]);
    }

    public function test_room_admin_can_delete_blackout_for_assigned_room(): void
    {
        $blackout = RoomBlackout::create([
            'room_id' => $this->assignedRoom->id,
            'title' => 'Assigned Room Blackout',
            'start_time' => now()->addDays(6)->setTime(8, 0, 0),
            'end_time' => now()->addDays(6)->setTime(10, 0, 0),
            'created_by' => $this->superAdmin->id,
        ]);

        $this->actingAs($this->roomAdmin)
            ->deleteJson("/api/admin/blackouts/{$blackout->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('room_blackouts', ['id' => $blackout->id]);
    }

    // ---------------------------------------------------------
    // Reports scoping
    // ---------------------------------------------------------

    public function test_room_admin_reports_scoped(): void
    {
        $start = Carbon::parse('2026-08-01');
        $end = Carbon::parse('2026-08-31');

        Booking::factory()->create([
            'room_id' => $this->assignedRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => $start->copy()->setTime(10, 0, 0),
            'end_time' => $start->copy()->setTime(12, 0, 0),
        ]);
        Booking::factory()->create([
            'room_id' => $this->otherRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => $start->copy()->setTime(10, 0, 0),
            'end_time' => $start->copy()->setTime(12, 0, 0),
        ]);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/reports/utilization?start_date='.$start->toDateString().'&end_date='.$end->toDateString());

        $response->assertStatus(200)
            ->assertJsonCount(1, 'rooms')
            ->assertJsonPath('rooms.0.room', $this->assignedRoom->name)
            ->assertJsonPath('rooms.0.booked_hours', 2);

        // Peak hours also scoped
        $peak = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/reports/peak-hours?start_date='.$start->toDateString().'&end_date='.$end->toDateString());

        $peak->assertStatus(200);
        $hours = collect($peak->json())->where('hour', '10:00')->first();
        $this->assertEquals(1, $hours['booking_count']);
    }

    // ---------------------------------------------------------
    // Room management
    // ---------------------------------------------------------

    public function test_room_admin_rooms_index_scoped(): void
    {
        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/rooms');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $this->assignedRoom->id);
    }

    public function test_room_admin_cannot_create_room(): void
    {
        $this->actingAs($this->roomAdmin)
            ->postJson('/api/admin/rooms', [
                'name' => 'New Sneaky Room',
                'capacity' => 10,
                'location_id' => $this->tpm->id,
                'amenities' => [],
            ])
            ->assertStatus(403);
    }

    public function test_room_admin_can_update_assigned_room(): void
    {
        $this->actingAs($this->roomAdmin)
            ->putJson("/api/admin/rooms/{$this->assignedRoom->id}", [
                'name' => 'Updated Room Name',
                'capacity' => 25,
                'location_id' => $this->tpm->id,
                'amenities' => [],
                'description' => 'Updated',
                'image_url' => '/images/rooms/default.png',
            ])
            ->assertStatus(200);

        $this->assertDatabaseHas('rooms', ['id' => $this->assignedRoom->id, 'name' => 'Updated Room Name']);
    }

    public function test_room_admin_cannot_update_other_room(): void
    {
        $this->actingAs($this->roomAdmin)
            ->putJson("/api/admin/rooms/{$this->otherRoom->id}", [
                'name' => 'Sneaky Update',
                'capacity' => 25,
                'location_id' => $this->tpm->id,
                'amenities' => [],
            ])
            ->assertStatus(403);
    }

    public function test_room_admin_cannot_toggle_other_room(): void
    {
        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/rooms/{$this->otherRoom->id}/toggle-active")
            ->assertStatus(403);
    }

    // ---------------------------------------------------------
    // Audit logs scoping
    // ---------------------------------------------------------

    public function test_room_admin_audit_logs_scoped(): void
    {
        AuditLog::create([
            'user_id' => $this->superAdmin->id,
            'action' => 'created',
            'changes' => ['assigned' => true],
            'booking_id' => Booking::factory()->create(['room_id' => $this->assignedRoom->id])->id,
        ]);
        AuditLog::create([
            'user_id' => $this->superAdmin->id,
            'action' => 'created',
            'changes' => ['assigned' => false],
            'booking_id' => Booking::factory()->create(['room_id' => $this->otherRoom->id])->id,
        ]);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/audit-logs');

        $response->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonFragment(['assigned' => true])
            ->assertJsonMissing(['assigned' => false]);
    }

    // ---------------------------------------------------------
    // Export scoping
    // ---------------------------------------------------------

    public function test_room_admin_export_scoped(): void
    {
        Booking::factory()->create(['room_id' => $this->assignedRoom->id, 'title' => 'Exported Event']);
        Booking::factory()->create(['room_id' => $this->otherRoom->id, 'title' => 'Not Exported Event']);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/bookings/export');

        $response->assertStatus(200);
        $csv = $response->streamedContent();
        $this->assertStringContainsString('Exported Event', $csv);
        $this->assertStringNotContainsString('Not Exported Event', $csv);
    }

    // ---------------------------------------------------------
    // Invitation flow (super admin only)
    // ---------------------------------------------------------

    public function test_super_admin_invites_room_admin_with_rooms(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/users/invite', [
                'email' => 'roomadmin@example.com',
                'role' => 'room_admin',
                'location_id' => $this->tpm->id,
                'room_ids' => [$this->assignedRoom->id, $this->otherRoom->id],
            ])
            ->assertStatus(201);

        $invitation = AdminInvitation::where('email', 'roomadmin@example.com')->first();
        $this->assertNotNull($invitation);
        $this->assertDatabaseHas('admin_invitation_room', [
            'admin_invitation_id' => $invitation->id,
            'room_id' => $this->assignedRoom->id,
        ]);
        $this->assertDatabaseHas('admin_invitation_room', [
            'admin_invitation_id' => $invitation->id,
            'room_id' => $this->otherRoom->id,
        ]);
    }

    public function test_room_admin_invite_requires_rooms(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/users/invite', [
                'email' => 'roomadmin2@example.com',
                'role' => 'room_admin',
                'location_id' => $this->tpm->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['room_ids']);
    }

    public function test_room_admin_invite_rejects_rooms_from_other_campus(): void
    {
        $khtpRoom = Room::factory()->create(['location_id' => $this->khtp->id]);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/users/invite', [
                'email' => 'roomadmin3@example.com',
                'role' => 'room_admin',
                'location_id' => $this->tpm->id,
                'room_ids' => [$khtpRoom->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['room_ids.0']);
    }

    public function test_claim_invite_attaches_room_scope(): void
    {
        $invitation = AdminInvitation::create([
            'email' => 'claimant@example.com',
            'role' => 'room_admin',
            'location_id' => $this->tpm->id,
            'token' => Str::random(60),
            'invited_by' => $this->superAdmin->id,
            'expires_at' => now()->addHours(48),
        ]);
        $invitation->rooms()->attach($this->assignedRoom->id);

        // Validate returns the room list
        $this->postJson('/api/auth/invitations/validate', ['token' => $invitation->token])
            ->assertStatus(200)
            ->assertJsonPath('role', 'room_admin')
            ->assertJsonPath('rooms.0.id', $this->assignedRoom->id);

        // Claim provisions the user with the room scope
        $this->postJson('/api/auth/invitations/claim', [
            'token' => $invitation->token,
            'name' => 'Claimant Admin',
            'department' => 'Facilities',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertStatus(201)
            ->assertJsonPath('user.role', 'room_admin')
            ->assertJsonPath('user.admin_rooms.0.id', $this->assignedRoom->id);

        $user = User::where('email', 'claimant@example.com')->first();
        $this->assertNotNull($user);
        $this->assertDatabaseHas('admin_room_user', [
            'user_id' => $user->id,
            'room_id' => $this->assignedRoom->id,
        ]);
    }

    // ---------------------------------------------------------
    // Super admin editing an existing user's room scope
    // ---------------------------------------------------------

    public function test_super_admin_update_user_sets_room_scope(): void
    {
        $user = User::factory()->create(['role' => UserRole::User]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/admin/users/{$user->id}", [
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'room_admin',
                'user_type' => 'internal',
                'location_id' => $this->tpm->id,
                'room_ids' => [$this->assignedRoom->id],
            ])
            ->assertStatus(200);

        $this->assertDatabaseHas('admin_room_user', [
            'user_id' => $user->id,
            'room_id' => $this->assignedRoom->id,
        ]);
    }

    public function test_super_admin_update_user_clears_room_scope_when_role_changes(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::RoomAdmin,
            'location_id' => $this->tpm->id,
        ]);
        $user->adminRooms()->attach($this->assignedRoom->id);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/admin/users/{$user->id}", [
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'location_admin',
                'user_type' => 'internal',
                'location_id' => $this->tpm->id,
            ])
            ->assertStatus(200);

        $this->assertDatabaseMissing('admin_room_user', ['user_id' => $user->id]);
    }

    // ---------------------------------------------------------
    // Email notifications for assigned rooms only
    // ---------------------------------------------------------

    public function test_room_admin_gets_email_for_new_booking_in_assigned_room_only(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        // Booking in assigned room → assigned room admin emailed
        $this->actingAs($this->normalUser)
            ->postJson('/api/bookings', [
                'room_id' => $this->assignedRoom->id,
                'title' => 'Assigned Room Booking',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ])
            ->assertStatus(201);

        Notification::assertSentTo($this->roomAdmin, AdminNewBookingNotification::class);
        Notification::assertNotSentTo($this->otherRoomAdmin, AdminNewBookingNotification::class);
    }

    // ---------------------------------------------------------
    // Zero-room regression: a room admin with no assigned rooms
    // must see nothing, never everything.
    // ---------------------------------------------------------

    public function test_zero_room_admin_has_no_booking_visibility(): void
    {
        $this->roomAdmin->adminRooms()->sync([]);

        Booking::factory()->create(['room_id' => $this->assignedRoom->id, 'title' => 'Leak Check Assigned']);
        Booking::factory()->create(['room_id' => $this->otherRoom->id, 'title' => 'Leak Check Other']);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/bookings');

        $response->assertStatus(200)
            ->assertJsonPath('total', 0)
            ->assertJsonPath('counts.all', 0)
            ->assertJsonPath('counts.pending', 0)
            ->assertJsonMissing(['title' => 'Leak Check Assigned'])
            ->assertJsonMissing(['title' => 'Leak Check Other']);
    }

    public function test_zero_room_admin_has_no_audit_log_visibility(): void
    {
        $this->roomAdmin->adminRooms()->sync([]);

        AuditLog::create([
            'user_id' => $this->superAdmin->id,
            'action' => 'created',
            'changes' => ['leak' => true],
            'booking_id' => Booking::factory()->create(['room_id' => $this->assignedRoom->id])->id,
        ]);

        $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/audit-logs')
            ->assertStatus(200)
            ->assertJsonPath('total', 0);
    }

    public function test_zero_room_admin_export_contains_no_rows(): void
    {
        $this->roomAdmin->adminRooms()->sync([]);

        Booking::factory()->create(['room_id' => $this->assignedRoom->id, 'title' => 'Leak Export Row']);

        $response = $this->actingAs($this->roomAdmin)
            ->getJson('/api/admin/bookings/export');

        $response->assertStatus(200);
        $this->assertStringNotContainsString('Leak Export Row', $response->streamedContent());
    }

    // ---------------------------------------------------------
    // Room show / attendance / series-cancel authorization
    // ---------------------------------------------------------

    public function test_room_admin_cannot_view_other_room_details(): void
    {
        $this->actingAs($this->roomAdmin)
            ->getJson("/api/admin/rooms/{$this->otherRoom->id}")
            ->assertStatus(403);

        $this->actingAs($this->roomAdmin)
            ->getJson("/api/admin/rooms/{$this->assignedRoom->id}")
            ->assertStatus(200)
            ->assertJsonPath('id', $this->assignedRoom->id);
    }

    public function test_room_admin_mark_attendance_scoped(): void
    {
        $past = now()->subHours(2);

        $assigned = Booking::factory()->create([
            'room_id' => $this->assignedRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => $past,
            'end_time' => $past->copy()->addHour(),
        ]);
        $other = Booking::factory()->create([
            'room_id' => $this->otherRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => $past,
            'end_time' => $past->copy()->addHour(),
        ]);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$other->id}/attendance", ['status' => 'attended'])
            ->assertStatus(403);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$assigned->id}/attendance", ['status' => 'attended'])
            ->assertStatus(200);

        $this->assertDatabaseHas('bookings', ['id' => $assigned->id, 'attendance_status' => 'attended']);
    }

    public function test_room_admin_cancel_series_denied_on_other_room(): void
    {
        $booking = Booking::factory()->create(['room_id' => $this->otherRoom->id, 'status' => BookingStatus::Approved]);

        $this->actingAs($this->roomAdmin)
            ->postJson("/api/admin/bookings/{$booking->id}/cancel-series", ['future_only' => false])
            ->assertStatus(403);
    }

    // ---------------------------------------------------------
    // Validation hardening: duplicate and cross-campus room ids
    // ---------------------------------------------------------

    public function test_room_admin_invite_rejects_duplicate_room_ids(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/users/invite', [
                'email' => 'roomadmin4@example.com',
                'role' => 'room_admin',
                'location_id' => $this->tpm->id,
                'room_ids' => [$this->assignedRoom->id, $this->assignedRoom->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['room_ids.0']);

        $this->assertDatabaseMissing('admin_invitations', ['email' => 'roomadmin4@example.com']);
    }

    public function test_super_admin_update_user_rejects_rooms_from_other_campus(): void
    {
        $khtpRoom = Room::factory()->create(['location_id' => $this->khtp->id]);
        $user = User::factory()->create(['role' => UserRole::User]);

        $this->actingAs($this->superAdmin)
            ->putJson("/api/admin/users/{$user->id}", [
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'room_admin',
                'user_type' => 'internal',
                'location_id' => $this->tpm->id,
                'room_ids' => [$khtpRoom->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['room_ids.0']);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'role' => 'user']);
    }
}
