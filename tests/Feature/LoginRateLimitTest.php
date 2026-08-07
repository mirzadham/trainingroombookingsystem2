<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
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
}
