<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Brute-force protection on the authentication endpoints.
 *
 * Admin panel access model: login rate limiting + strong passwords +
 * audit logging (no IP restriction).
 */
class LoginRateLimitTest extends TestCase
{
    /**
     * Admin login is rate limited: 5 attempts per minute per IP.
     */
    public function test_admin_login_rate_limited_after_five_attempts(): void
    {
        User::factory()->create([
            'email' => 'admin@mimos.my',
            'role' => UserRole::SuperAdmin,
        ]);

        $attempt = fn () => $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@mimos.my',
            'password' => 'wrong-password',
        ]);

        foreach (range(1, 5) as $attemptNumber) {
            $attempt()->assertStatus(422); // valid credentials check, not throttled yet
        }

        $attempt()->assertStatus(429); // 6th attempt within the minute -> throttled
    }

    /**
     * Standard (non-admin) login keeps its own rate limit independent of admin login.
     */
    public function test_standard_login_rate_limited_after_ten_attempts(): void
    {
        User::factory()->create([
            'email' => 'user@example.com',
            'role' => UserRole::User,
        ]);

        foreach (range(1, 10) as $attemptNumber) {
            $this->postJson('/api/auth/login', [
                'email' => 'user@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'user@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    /**
     * Successful logins also count toward the per-minute window.
     */
    public function test_successful_login_counts_toward_limit(): void
    {
        User::factory()->create([
            'email' => 'admin@mimos.my',
            'role' => UserRole::SuperAdmin,
            'password' => 'correct-password',
        ]);

        // Four failed attempts...
        foreach (range(1, 4) as $attemptNumber) {
            $this->postJson('/api/auth/admin/login', [
                'email' => 'admin@mimos.my',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        // ...then a successful one — still one of the 5 allowed attempts.
        $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@mimos.my',
            'password' => 'correct-password',
        ])->assertOk();

        // The 6th request within the minute is throttled.
        $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@mimos.my',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    /**
     * Registration is rate limited to prevent signup spam.
     */
    public function test_registration_rate_limited_after_three_attempts(): void
    {
        foreach (range(1, 3) as $attemptNumber) {
            $this->postJson('/api/auth/register', [
                'name' => 'Spam User',
                'email' => "spam{$attemptNumber}@example.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'phone' => '+60123456789',
                'user_type' => 'external',
            ])->assertStatus(201);
        }

        $this->postJson('/api/auth/register', [
            'name' => 'Spam User',
            'email' => 'spam4@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+60123456789',
            'user_type' => 'external',
        ])->assertStatus(429);
    }

    /**
     * Forgot-password is rate limited: 3 requests per 10 minutes per IP.
     */
    public function test_forgot_password_rate_limited_after_three_attempts(): void
    {
        Notification::fake();

        User::factory()->create(['email' => 'recover@example.com']);

        foreach (range(1, 3) as $attemptNumber) {
            $this->postJson('/api/auth/forgot-password', [
                'email' => 'recover@example.com',
            ])->assertStatus(200);
        }

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'recover@example.com',
        ])->assertStatus(429);
    }

    /**
     * Reset-password is rate limited: 5 requests per 10 minutes per IP.
     */
    public function test_reset_password_rate_limited_after_five_attempts(): void
    {
        User::factory()->create(['email' => 'recover@example.com']);

        $attempt = fn () => $this->postJson('/api/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => 'recover@example.com',
            'password' => 'new_secure_password',
            'password_confirmation' => 'new_secure_password',
        ]);

        foreach (range(1, 5) as $attemptNumber) {
            $attempt()->assertStatus(422); // invalid token, not throttled yet
        }

        $attempt()->assertStatus(429); // 6th request within the window
    }

    /**
     * Invitation validation is rate limited: 5 requests per 10 minutes per IP.
     */
    public function test_invitation_validation_rate_limited_after_five_attempts(): void
    {
        $attempt = fn () => $this->postJson('/api/auth/invitations/validate', [
            'token' => 'invalid-token',
        ]);

        foreach (range(1, 5) as $attemptNumber) {
            $attempt()->assertStatus(404); // unknown invitation, not throttled yet
        }

        $attempt()->assertStatus(429); // 6th request within the window
    }

    /**
     * Each endpoint keeps its OWN budget — traffic on one endpoint must never
     * exhaust another endpoint's limit. (Regression test: the inline
     * 'throttle:N,M' syntax shared a single counter per IP across all auth
     * routes, so 5 user logins would block the admin login.)
     */
    public function test_endpoint_budgets_are_independent(): void
    {
        User::factory()->create([
            'email' => 'admin@mimos.my',
            'role' => UserRole::SuperAdmin,
        ]);

        // Exhaust the /api/auth/login budget: 10 allowed, 11th throttled.
        foreach (range(1, 10) as $attemptNumber) {
            $this->postJson('/api/auth/login', [
                'email' => 'nobody@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);

        // Other endpoints from the same IP still have their own fresh budgets.
        $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@mimos.my',
            'password' => 'wrong-password',
        ])->assertStatus(422);

        $this->postJson('/api/auth/register', [
            'name' => 'New User',
            'email' => 'fresh@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+60123456789',
            'user_type' => 'external',
        ])->assertStatus(201);
    }

    /**
     * The rate limit is per IP — one client exhausting the budget must not
     * affect a different client.
     */
    public function test_rate_limit_is_per_ip(): void
    {
        User::factory()->create([
            'email' => 'admin@mimos.my',
            'role' => UserRole::SuperAdmin,
        ]);

        // Attacker IP exhausts the admin login budget.
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.1']);
        foreach (range(1, 5) as $attemptNumber) {
            $this->postJson('/api/auth/admin/login', [
                'email' => 'admin@mimos.my',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        // 6th attempt from the same IP is throttled.
        $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@mimos.my',
            'password' => 'wrong-password',
        ])->assertStatus(429);

        // A different IP is unaffected.
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.2']);
        $this->postJson('/api/auth/admin/login', [
            'email' => 'admin@mimos.my',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }
}
