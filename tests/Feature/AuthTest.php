<?php

namespace Tests\Feature;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ResetPasswordNotification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    /**
     * Test successful registration.
     */
    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+60123456789',
            'user_type' => 'external',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'user_type'],
                'token'
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'role' => 'user',
        ]);
    }

    /**
     * Test registration validation errors.
     */
    public function test_user_cannot_register_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'duplicate@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'duplicate@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+60123456789',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * Test standard user login.
     */
    public function test_standard_user_can_login(): void
    {
        $user = User::factory()->create([
            'email' => 'user@mimos.my',
            'password' => Hash::make('password123'),
            'role' => UserRole::User,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'user@mimos.my',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'token']);
    }

    /**
     * Test admin blocked from standard login.
     */
    public function test_admin_cannot_use_standard_login(): void
    {
        User::factory()->create([
            'email' => 'admin@mimos.my',
            'password' => Hash::make('password123'),
            'role' => UserRole::LocationAdmin,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@mimos.my',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['Please use the admin login portal.']
            ]);
    }

    /**
     * Test admin login portal.
     */
    public function test_admin_can_use_admin_login(): void
    {
        User::factory()->create([
            'email' => 'admin@mimos.my',
            'password' => Hash::make('password123'),
            'role' => UserRole::LocationAdmin,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@mimos.my',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'token']);
    }

    /**
     * Test user blocked from admin login portal.
     */
    public function test_user_cannot_use_admin_login(): void
    {
        User::factory()->create([
            'email' => 'user@mimos.my',
            'password' => Hash::make('password123'),
            'role' => UserRole::User,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/admin/login', [
            'email' => 'user@mimos.my',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['This account does not have admin privileges.']
            ]);
    }

    /**
     * Test suspended user login is blocked.
     */
    public function test_suspended_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'suspended@mimos.my',
            'password' => Hash::make('password123'),
            'role' => UserRole::User,
            'status' => 'suspended',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'suspended@mimos.my',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['Your account has been suspended. Please contact a Super Admin.']
            ]);
    }

    /**
     * Test user logout.
     */
    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Logged out successfully.']);

        $this->assertEmpty($user->tokens);
    }

    /**
     * Test user profile update.
     */
    public function test_user_can_update_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
            'phone' => '123',
        ]);

        $response = $this->actingAs($user)
            ->putJson('/api/auth/user', [
                'name' => 'New Name',
                'email' => 'new@example.com',
                'phone' => '456',
                'department' => 'IT Services',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'New Name'])
            ->assertJsonFragment(['email' => 'new@example.com']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'email' => 'new@example.com',
        ]);
    }

    /**
     * Test password update.
     */
    public function test_user_can_update_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old_password'),
        ]);

        $response = $this->actingAs($user)
            ->putJson('/api/auth/user/password', [
                'current_password' => 'old_password',
                'password' => 'new_password123',
                'password_confirmation' => 'new_password123',
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Password updated successfully.']);

        $this->assertTrue(Hash::check('new_password123', $user->fresh()->password));
    }

    /**
     * Test forgot password.
     */
    public function test_forgot_password_sends_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'recover@example.com']);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'recover@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'We have emailed your password reset link.']);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'recover@example.com',
        ]);

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    /**
     * Test reset password with token.
     */
    public function test_reset_password_resets_successfully(): void
    {
        $user = User::factory()->create([
            'email' => 'recover@example.com',
            'password' => Hash::make('old_password'),
        ]);

        $token = 'secure-reset-token';

        DB::table('password_reset_tokens')->insert([
            'email' => 'recover@example.com',
            'token' => Hash::make($token),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'recover@example.com',
            'password' => 'new_secure_password',
            'password_confirmation' => 'new_secure_password',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Your password has been reset successfully.']);

        $this->assertTrue(Hash::check('new_secure_password', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'recover@example.com']);
    }
}
