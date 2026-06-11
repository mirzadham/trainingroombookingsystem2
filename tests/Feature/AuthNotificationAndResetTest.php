<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\Location;
use App\Models\User;
use App\Models\BookingNotification;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\BookingStatusChangedNotification;
use App\Enums\UserRole;
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

        // Assert notification logged in database (remains pending because Notification::fake() is used)
        $this->assertDatabaseHas('booking_notifications', [
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'type' => 'submitted',
            'channel' => 'email',
            'status' => 'pending',
        ]);

        Notification::assertSentTo($user, BookingStatusChangedNotification::class);
    }

    public function test_booking_notification_tracks_attempts_and_success_without_fake(): void
    {
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

        // Assert notification database record transitions to 'sent' and 'attempts' is 1
        $this->assertDatabaseHas('booking_notifications', [
            'user_id' => $user->id,
            'booking_id' => $booking->id,
            'type' => 'submitted',
            'channel' => 'email',
            'status' => 'sent',
            'attempts' => 1,
        ]);
    }

    public function test_booking_notification_contains_pic_details(): void
    {
        $user = User::factory()->create([
            'name' => 'Booker User',
            'email' => 'booker@mimos.my',
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

        $booking = Booking::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'title' => 'Test Meeting',
            'start_time' => now()->addDays(2)->setTime(10, 0, 0),
            'end_time' => now()->addDays(2)->setTime(11, 0, 0),
            'attendees' => 20,
            'phone' => '+60123456789',
            'status' => \App\Enums\BookingStatus::Pending,
        ]);

        // 1. Pending / Submitted status - no location admins -> should use env fallback
        $notification = new BookingStatusChangedNotification($booking, 'submitted');
        $mailMessage = $notification->toMail($user);
        $mailContent = implode("\n", $mailMessage->introLines);
        $this->assertStringContainsString('MIMOS Academy', $mailContent);
        $this->assertStringContainsString('academy@mimos.my', $mailContent);
        $this->assertStringContainsString('04-40525404', $mailContent);

        // 2. Pending / Submitted status - with location admin -> should use location admin details
        $locationAdmin = User::factory()->create([
            'name' => 'HQ Location Admin',
            'email' => 'hqadmin@mimos.my',
            'phone' => '03-11112222',
            'role' => UserRole::LocationAdmin,
            'location_id' => $location->id,
        ]);
        // Refresh room/location relation to load the new admin
        $booking->load('room.location.admins');

        $notification = new BookingStatusChangedNotification($booking, 'submitted');
        $mailMessage = $notification->toMail($user);
        $mailContent = implode("\n", $mailMessage->introLines);
        $this->assertStringContainsString('HQ Location Admin', $mailContent);
        $this->assertStringContainsString('hqadmin@mimos.my', $mailContent);
        $this->assertStringContainsString('03-11112222', $mailContent);

        // 3. Approved status -> should use approver details
        $approver = User::factory()->create([
            'name' => 'Approver Admin',
            'email' => 'approver@mimos.my',
            'phone' => '03-33334444',
            'role' => UserRole::SuperAdmin,
        ]);
        $booking->update([
            'status' => \App\Enums\BookingStatus::Approved,
            'approved_by' => $approver->id,
        ]);
        $booking->load('approver');

        $notification = new BookingStatusChangedNotification($booking, 'approved');
        $mailMessage = $notification->toMail($user);
        $mailContent = implode("\n", $mailMessage->introLines);
        $this->assertStringContainsString('Approver Admin', $mailContent);
        $this->assertStringContainsString('approver@mimos.my', $mailContent);
        $this->assertStringContainsString('03-33334444', $mailContent);

        // 4. Rejected status -> should use rejecter details
        $rejecter = User::factory()->create([
            'name' => 'Rejecter Admin',
            'email' => 'rejecter@mimos.my',
            'phone' => '03-55556666',
            'role' => UserRole::SuperAdmin,
        ]);
        $booking->update([
            'status' => \App\Enums\BookingStatus::Rejected,
            'rejected_by' => $rejecter->id,
            'rejection_reason' => 'Duplicate request',
        ]);
        $booking->load('rejecter');

        $notification = new BookingStatusChangedNotification($booking, 'rejected');
        $mailMessage = $notification->toMail($user);
        $mailContent = implode("\n", $mailMessage->introLines);
        $this->assertStringContainsString('Rejecter Admin', $mailContent);
        $this->assertStringContainsString('rejecter@mimos.my', $mailContent);
        $this->assertStringContainsString('03-55556666', $mailContent);
    }
}
