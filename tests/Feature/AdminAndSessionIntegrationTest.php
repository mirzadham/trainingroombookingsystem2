<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\Location;
use App\Models\User;
use App\Models\AuditLog;
use App\Models\AdminInvitation;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use Carbon\Carbon;

class AdminAndSessionIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_invitations_suspensions_and_session_lifecycle(): void
    {
        // 0. Fake Notifications
        Notification::fake();

        // 1. SETUP SEED DATA
        $tpmLocation = Location::create([
            'name' => 'Technology Park Malaysia',
            'code' => 'TPM',
        ]);

        $room = Room::create([
            'location_id' => $tpmLocation->id,
            'name' => 'Fluorine Room',
            'capacity' => 15,
            'is_active' => true,
        ]);

        $regularUser = User::factory()->create([
            'name' => 'Jane Smith',
            'email' => 'jane@mimos.my',
            'role' => UserRole::User,
            'password' => Hash::make('password123'),
        ]);

        $superAdmin = User::factory()->create([
            'name' => 'Super Admin Alpha',
            'email' => 'superalpha@mimos.my',
            'role' => UserRole::SuperAdmin,
            'password' => Hash::make('password123'),
        ]);

        // Login to get a real token for testing Sanctum token features as Super Admin
        $adminToken = $this->postJson('/api/auth/admin/login', [
            'email' => 'superalpha@mimos.my',
            'password' => 'password123',
        ])->json('token');

        // 2. ADMIN INVITATIONS LIFECYCLE
        // Super Admin invites a new Location Admin
        $inviteResponse = $this->withToken($adminToken)
            ->postJson('/api/admin/users/invite', [
                'email' => 'newadmin@mimos.my',
                'role' => 'location_admin',
                'location_id' => $tpmLocation->id,
            ]);
        $inviteResponse->assertStatus(201);
        $invitationId = $inviteResponse->json('invitation.id');
        $token = $inviteResponse->json('invitation.token');
        $this->assertNotNull($token);

        // List pending invitations
        $listInvitesResponse = $this->withToken($adminToken)
            ->getJson('/api/admin/users/invitations');
        $listInvitesResponse->assertStatus(200);
        $listInvitesResponse->assertJsonCount(1);

        // Resend / Renew invitation
        $resendResponse = $this->withToken($adminToken)
            ->postJson("/api/admin/users/invitations/{$invitationId}/resend");
        $resendResponse->assertStatus(200);
        $newToken = $resendResponse->json('invitation.token');
        $this->assertNotEquals($token, $newToken); // Token renewed

        // Validate token anonymously
        $validateResponse = $this->postJson('/api/auth/invitations/validate', [
            'token' => $newToken,
        ]);
        $validateResponse->assertStatus(200);
        $validateResponse->assertJsonFragment([
            'email' => 'newadmin@mimos.my',
            'role' => 'location_admin',
        ]);

        // Claim invite to provision administrative account
        $claimResponse = $this->postJson('/api/auth/invitations/claim', [
            'token' => $newToken,
            'name' => 'Alex Provisioned',
            'department' => 'Software R&D',
            'phone' => '+60123456781',
            'password' => 'newadminpass123',
            'password_confirmation' => 'newadminpass123',
        ]);
        $claimResponse->assertStatus(201);
        $claimResponse->assertJsonStructure(['token', 'user']);

        // Verify account exists in database and is location_admin
        $this->assertDatabaseHas('users', [
            'email' => 'newadmin@mimos.my',
            'role' => 'location_admin',
            'location_id' => $tpmLocation->id,
            'name' => 'Alex Provisioned',
        ]);

        // 3. USER MANAGEMENT & SUSPENSIONS BOUNDARY
        // Super Admin lists all active users
        $listUsersResponse = $this->withToken($adminToken)
            ->getJson('/api/admin/users');
        $listUsersResponse->assertStatus(200);
        
        // Super Admin suspends the regular user (Jane Smith)
        $toggleStatusResponse = $this->withToken($adminToken)
            ->postJson("/api/admin/users/{$regularUser->id}/toggle-status");
        $toggleStatusResponse->assertStatus(200);
        $this->assertEquals('suspended', User::find($regularUser->id)->status);

        // Suspended user attempts to log in -> MUST fail
        $suspendedLoginResponse = $this->postJson('/api/auth/login', [
            'email' => 'jane@mimos.my',
            'password' => 'password123',
        ]);
        $suspendedLoginResponse->assertStatus(422);
        $suspendedLoginResponse->assertJsonFragment([
            'email' => ['Your account has been suspended. Please contact a Super Admin.'],
        ]);

        // Super Admin reactivates the regular user
        $this->withToken($adminToken)
            ->postJson("/api/admin/users/{$regularUser->id}/toggle-status");
        $this->assertEquals('active', User::find($regularUser->id)->status);

        // Clear authenticated user from Laravel memory to force token re-validation
        \Illuminate\Support\Facades\Auth::forgetUser();

        // Login to get a real token for testing Sanctum token features as regular user
        $janeToken = $this->postJson('/api/auth/login', [
            'email' => 'jane@mimos.my',
            'password' => 'password123',
        ])->json('token');

        // 4. USER PROFILE SECURITY & SESSION MANAGEMENT
        // Regular user retrieves their profile context
        $profileResponse = $this->withToken($janeToken)
            ->getJson('/api/auth/user');
        $profileResponse->assertStatus(200);
        $profileResponse->assertJsonFragment([
            'email' => 'jane@mimos.my',
        ]);

        // Regular user updates their profile details
        $updateProfileResponse = $this->withToken($janeToken)
            ->putJson('/api/auth/user', [
                'name' => 'Jane Smith Updated',
                'email' => 'jane@mimos.my',
                'phone' => '+60111223344',
                'department' => 'MIMOS Academy Team',
            ]);
        $updateProfileResponse->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $regularUser->id,
            'name' => 'Jane Smith Updated',
            'phone' => '+60111223344',
        ]);

        // Regular user updates password with old password verification
        // Fails with incorrect old password
        $pwFailResponse = $this->withToken($janeToken)
            ->putJson('/api/auth/user/password', [
                'current_password' => 'wrongoldpassword',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ]);
        $pwFailResponse->assertStatus(422);

        // Succeeds with correct old password
        $pwSuccessResponse = $this->withToken($janeToken)
            ->putJson('/api/auth/user/password', [
                'current_password' => 'password123',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ]);
        $pwSuccessResponse->assertStatus(200);

        // Regular user logs out (revokes token)
        $logoutResponse = $this->withToken($janeToken)
            ->postJson('/api/auth/logout');
        $logoutResponse->assertStatus(200);

        // Clear resolved user to force re-authentication using the header on the next request
        \Illuminate\Support\Facades\Auth::forgetUser();

        // Subsequent requests with the revoked token must fail with 401
        $this->withToken($janeToken)
            ->getJson('/api/auth/user')
            ->assertStatus(401);

        // Clear authenticated user from Laravel memory to force token re-validation
        \Illuminate\Support\Facades\Auth::forgetUser();

        // 5. ADMINISTRATIVE BATCH & OVERRIDE OPERATIONS
        // Setup pending bookings to bulk test
        $bookingDate = now()->addDays(5);
        $b1 = Booking::create([
            'user_id' => $regularUser->id,
            'room_id' => $room->id,
            'title' => 'Bulk Booking A',
            'start_time' => $bookingDate->copy()->setTime(9, 0, 0)->toDateTimeString(),
            'end_time' => $bookingDate->copy()->setTime(10, 0, 0)->toDateTimeString(),
            'attendees' => 5,
            'phone' => '+60123456789',
            'status' => \App\Enums\BookingStatus::Pending,
        ]);

        $b2 = Booking::create([
            'user_id' => $regularUser->id,
            'room_id' => $room->id,
            'title' => 'Bulk Booking B',
            'start_time' => $bookingDate->copy()->setTime(11, 0, 0)->toDateTimeString(),
            'end_time' => $bookingDate->copy()->setTime(12, 0, 0)->toDateTimeString(),
            'attendees' => 5,
            'phone' => '+60123456789',
            'status' => \App\Enums\BookingStatus::Pending,
        ]);

        // Batch Approve bookings
        $batchApproveResponse = $this->withToken($adminToken)
            ->postJson('/api/admin/bookings/batch-approve', [
                'ids' => [$b1->id, $b2->id],
            ]);
        $batchApproveResponse->assertStatus(200);
        $this->assertEquals('approved', Booking::find($b1->id)->status->value);
        $this->assertEquals('approved', Booking::find($b2->id)->status->value);

        // Batch Reject bookings
        $b3 = Booking::create([
            'user_id' => $regularUser->id,
            'room_id' => $room->id,
            'title' => 'Bulk Booking C',
            'start_time' => $bookingDate->copy()->setTime(13, 0, 0)->toDateTimeString(),
            'end_time' => $bookingDate->copy()->setTime(14, 0, 0)->toDateTimeString(),
            'attendees' => 5,
            'phone' => '+60123456789',
            'status' => \App\Enums\BookingStatus::Pending,
        ]);

        $batchRejectResponse = $this->withToken($adminToken)
            ->postJson('/api/admin/bookings/batch-reject', [
                'ids' => [$b3->id],
                'reason' => 'Facilities conflict',
            ]);
        $batchRejectResponse->assertStatus(200);
        $this->assertEquals('rejected', Booking::find($b3->id)->status->value);
        $this->assertEquals('Facilities conflict', Booking::find($b3->id)->rejection_reason);

        // Admin cancels approved booking with mandatory remarks
        $adminCancelResponse = $this->withToken($adminToken)
            ->postJson("/api/admin/bookings/{$b1->id}/cancel", [
                'remarks' => 'Air conditioner malfunctioned',
            ]);
        $adminCancelResponse->assertStatus(200);
        $this->assertEquals('cancelled', Booking::find($b1->id)->status->value);

        // Admin updates/reschedules booking
        $newStartTime = $bookingDate->copy()->setTime(15, 0, 0)->toDateTimeString();
        $newEndTime = $bookingDate->copy()->setTime(16, 30, 0)->toDateTimeString();
        $adminUpdateResponse = $this->withToken($adminToken)
            ->putJson("/api/admin/bookings/{$b2->id}", [
                'start_time' => $newStartTime,
                'end_time' => $newEndTime,
                'title' => 'Rescheduled Meeting',
                'attendees' => 8,
            ]);
        $adminUpdateResponse->assertStatus(200);
        $this->assertEquals('Rescheduled Meeting', Booking::find($b2->id)->title);

        // 6. DIRECT TIMELINE, SUGGESTIONS & AUDIT LOGS ENDPOINTS
        // GET /api/availability/timeline
        $timelineResponse = $this->getJson("/api/availability/timeline?location_id={$tpmLocation->id}&date={$bookingDate->format('Y-m-d')}");
        $timelineResponse->assertStatus(200);
        $timelineResponse->assertJsonStructure(['date', 'time_slots', 'grid']);

        // GET /api/availability/suggestions
        $suggestionsResponse = $this->getJson("/api/availability/suggestions?location_id={$tpmLocation->id}&date={$bookingDate->format('Y-m-d')}&start_time=11:00&end_time=12:00&attendees=10");
        $suggestionsResponse->assertStatus(200);

        // GET /api/admin/audit-logs
        $auditLogsResponse = $this->withToken($adminToken)
            ->getJson('/api/admin/audit-logs');
        $auditLogsResponse->assertStatus(200);
        $auditLogsResponse->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'action',
                    'user_id',
                    'ip_address',
                ]
            ]
        ]);
    }
}
