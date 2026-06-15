<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\User;
use App\Models\AdminInvitation;
use App\Models\AuditLog;
use App\Enums\UserRole;
use App\Notifications\AdminInvitationNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    private User $superAdmin;
    private User $normalUser;
    private Location $location;

    protected function setUp(): void
    {
        parent::setUp();

        $this->location = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);
        $this->superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $this->normalUser = User::factory()->create(['role' => UserRole::User]);
    }

    /**
     * Test list users endpoint.
     */
    public function test_only_super_admin_can_list_users(): void
    {
        // Normal user forbidden
        $this->actingAs($this->normalUser)
            ->getJson('/api/admin/users')
            ->assertStatus(403);

        // Super Admin succeeds
        $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/users')
            ->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page', 'total']);
    }

    /**
     * Test update user details.
     */
    public function test_super_admin_can_update_user(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
            'role' => UserRole::User,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->putJson("/api/admin/users/{$user->id}", [
                'name' => 'New Name',
                'email' => 'old@example.com',
                'role' => 'location_admin',
                'user_type' => 'internal',
                'location_id' => $this->location->id,
                'phone' => '+60123456789',
                'department' => 'Facility Management',
            ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertEquals('New Name', $user->name);
        $this->assertEquals(UserRole::LocationAdmin, $user->role);

        // Check Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->superAdmin->id,
            'action' => 'updated_user',
        ]);
    }

    /**
     * Test suspend user terminates tokens.
     */
    public function test_super_admin_can_suspend_user_and_terminate_sessions(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        
        // Give user some tokens
        $user->createToken('test-token-1');
        $user->createToken('test-token-2');

        $this->assertCount(2, $user->tokens);

        $response = $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/users/{$user->id}/toggle-status");

        $response->assertStatus(200)
            ->assertJsonPath('user.status', 'suspended');

        $user->refresh();
        $this->assertEquals('suspended', $user->status);
        
        // Assert all Sanctum tokens are deleted
        $this->assertCount(0, $user->tokens);

        // Check Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->superAdmin->id,
            'action' => 'suspended_user',
        ]);
    }

    /**
     * Test cannot suspend self.
     */
    public function test_super_admin_cannot_suspend_self(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/users/{$this->superAdmin->id}/toggle-status");

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Operation Denied. You cannot suspend your own administrative account.'
            ]);
    }

    /**
     * Test admin invitation cycle.
     */
    public function test_admin_invitation_lifecycle(): void
    {
        Notification::fake();

        // 1. Invite Admin
        $inviteResponse = $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/users/invite', [
                'email' => 'newadmin@mimos.my',
                'role' => 'location_admin',
                'location_id' => $this->location->id,
            ]);

        $inviteResponse->assertStatus(201);
        
        $this->assertDatabaseHas('admin_invitations', [
            'email' => 'newadmin@mimos.my',
            'role' => 'location_admin',
            'location_id' => $this->location->id,
        ]);

        $invitation = AdminInvitation::where('email', 'newadmin@mimos.my')->first();
        $this->assertNotNull($invitation->token);
        
        Notification::assertSentTo(
            new \Illuminate\Notifications\AnonymousNotifiable,
            AdminInvitationNotification::class,
            function ($notification, $channels, $notifiable) {
                return $notifiable->routes['mail'] === 'newadmin@mimos.my';
            }
        );

        // 2. Validate Token
        $validateResponse = $this->postJson('/api/auth/invitations/validate', [
            'token' => $invitation->token,
        ]);

        $validateResponse->assertStatus(200)
            ->assertJsonPath('email', 'newadmin@mimos.my');

        // 3. Claim Invitation
        $claimResponse = $this->postJson('/api/auth/invitations/claim', [
            'token' => $invitation->token,
            'name' => 'John Admin',
            'department' => 'IT Services',
            'phone' => '+60111222333',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $claimResponse->assertStatus(201)
            ->assertJsonStructure(['user', 'token']);

        // Verify account created
        $this->assertDatabaseHas('users', [
            'email' => 'newadmin@mimos.my',
            'role' => 'location_admin',
            'department' => 'IT Services',
        ]);

        $this->assertNotNull($invitation->fresh()->accepted_at);

        // Verify Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'claimed_admin_invite',
        ]);
    }

    /**
     * Test resend and revoke invitations.
     */
    public function test_resend_and_revoke_invitations(): void
    {
        Notification::fake();

        $invitation = AdminInvitation::create([
            'email' => 'pending@mimos.my',
            'role' => 'location_admin',
            'location_id' => $this->location->id,
            'token' => 'old-token',
            'invited_by' => $this->superAdmin->id,
            'expires_at' => now()->subHours(1), // Expired
        ]);

        // 1. Resend/Renew
        $resendResponse = $this->actingAs($this->superAdmin)
            ->postJson("/api/admin/users/invitations/{$invitation->id}/resend");

        $resendResponse->assertStatus(200);
        $invitation->refresh();
        
        $this->assertNotEquals('old-token', $invitation->token);
        $this->assertTrue(now()->addHours(47)->lt($invitation->expires_at));

        Notification::assertSentTo(
            new \Illuminate\Notifications\AnonymousNotifiable,
            AdminInvitationNotification::class,
            function ($notification, $channels, $notifiable) {
                return $notifiable->routes['mail'] === 'pending@mimos.my';
            }
        );

        // 2. Revoke/Delete
        $revokeResponse = $this->actingAs($this->superAdmin)
            ->deleteJson("/api/admin/users/invitations/{$invitation->id}");

        $revokeResponse->assertStatus(200);
        $this->assertDatabaseMissing('admin_invitations', ['id' => $invitation->id]);
    }
}
