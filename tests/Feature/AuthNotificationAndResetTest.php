<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\Location;
use App\Models\User;
use App\Models\BookingNotification;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\BookingStatusChangedNotification;
use App\Services\BookingService;
use App\Services\ApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthNotificationAndResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_notification_and_saves_token(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@mimos.my',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'test@mimos.my',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'We have emailed your password reset link.',
        ]);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'test@mimos.my',
        ]);

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_password_updates_user_password_and_deletes_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@mimos.my',
            'password' => Hash::make('old-password'),
        ]);

        $rawToken = 'secret-reset-token';

        DB::table('password_reset_tokens')->insert([
            'email' => 'test@mimos.my',
            'token' => Hash::make($rawToken),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'test@mimos.my',
            'token' => $rawToken,
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Your password has been reset successfully.',
        ]);

        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'test@mimos.my',
        ]);

        $this->assertTrue(Hash::check('new-password-456', $user->fresh()->password));
    }

    public function test_booking_creation_triggers_submitted_notification_and_logs_in_database(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@mimos.my',
        ]);

        $location = Location::create([
            'name' => 'Kuala Lumpur HQ',
            'code' => 'KLHQ',
        ]);

        $room = Room::create([
            'location_id' => $location->id,
            'name' => 'Auditorium Alpha',
            'capacity' => 50,
            'is_active' => true,
        ]);

        // Mock booking data
        $bookingData = [
            'room_id' => $room->id,
            'title' => 'Project Kickoff Meeting',
            'description' => 'Important internal alignment',
            'start_time' => now()->addDays(2)->setTime(10, 0, 0)->toDateTimeString(),
            'end_time' => now()->addDays(2)->setTime(11, 0, 0)->toDateTimeString(),
            'attendees' => 20,
            'phone' => '+60123456789',
        ];

        $bookingService = app(BookingService::class);
        $booking = $bookingService->create($bookingData, $user);

        // Assert notification logged in database
        $this->assertDatabaseHas('booking_notifications', [
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'type' => 'submitted',
            'channel' => 'email',
            'status' => 'sent',
        ]);

        Notification::assertSentTo($user, BookingStatusChangedNotification::class);
    }
}
