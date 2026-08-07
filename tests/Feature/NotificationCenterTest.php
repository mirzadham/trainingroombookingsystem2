<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationCenterTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $location = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);

        $this->room = Room::factory()->create([
            'location_id' => $location->id,
            'capacity' => 20,
            'is_active' => true,
        ]);

        $this->user = User::factory()->create(['role' => UserRole::User]);
    }

    /**
     * Test that submitting a booking creates an in-app notification.
     */
    public function test_booking_submission_creates_in_app_notification(): void
    {
        Notification::fake();

        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $response = $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Notification Test',
                'start_date' => $start->toDateString(),
                'end_date' => $start->toDateString(),
                'start_time' => $start->toDateTimeString(),
                'end_time' => $end->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->user->id,
            'type' => 'submitted',
        ]);
    }

    /**
     * Test that the notification list endpoint returns the user's notifications.
     */
    public function test_notification_list_and_unread_count(): void
    {
        $booking = Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'title' => 'My Notification',
            'start_time' => now()->addDays(2)->setTime(10, 0, 0),
            'end_time' => now()->addDays(2)->setTime(12, 0, 0),
            'status' => BookingStatus::Pending,
        ]);

        UserNotification::create([
            'user_id' => $this->user->id,
            'booking_id' => $booking->id,
            'type' => 'submitted',
            'message' => 'Your booking request for Test Room has been submitted.',
        ]);

        UserNotification::create([
            'user_id' => $this->user->id,
            'booking_id' => $booking->id,
            'type' => 'approved',
            'message' => 'Your booking for Test Room has been approved.',
            'read_at' => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(2, $response->json()['total']);
        $this->assertEquals('approved', $response->json()['data'][0]['type']); // newest first

        $this->actingAs($this->user)
            ->getJson('/api/notifications/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 1);
    }

    /**
     * Test that users cannot mark other users' notifications as read.
     */
    public function test_cannot_mark_others_notification_read(): void
    {
        $otherUser = User::factory()->create(['role' => UserRole::User]);

        $notification = UserNotification::create([
            'user_id' => $otherUser->id,
            'type' => 'submitted',
            'message' => 'Someone else\'s notification',
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/notifications/{$notification->id}/read")
            ->assertStatus(403);

        $this->assertNull($notification->fresh()->read_at);
    }

    /**
     * Test marking a single notification as read.
     */
    public function test_mark_single_notification_read(): void
    {
        $notification = UserNotification::create([
            'user_id' => $this->user->id,
            'type' => 'reminder',
            'message' => 'Reminder: your booking starts soon.',
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/notifications/{$notification->id}/read")
            ->assertStatus(200);

        $this->assertNotNull($notification->fresh()->read_at);

        $this->actingAs($this->user)
            ->getJson('/api/notifications/unread-count')
            ->assertJsonPath('unread_count', 0);
    }

    /**
     * Test marking all notifications as read.
     */
    public function test_mark_all_notifications_read(): void
    {
        UserNotification::create(['user_id' => $this->user->id, 'type' => 'submitted', 'message' => 'One']);
        UserNotification::create(['user_id' => $this->user->id, 'type' => 'approved', 'message' => 'Two']);

        $this->actingAs($this->user)
            ->postJson('/api/notifications/read-all')
            ->assertStatus(200)
            ->assertJsonPath('updated', 2);

        $this->assertDatabaseMissing('user_notifications', [
            'user_id' => $this->user->id,
            'read_at' => null,
        ]);
    }

    /**
     * Test that notifications are only visible to their owner.
     */
    public function test_notification_list_is_scoped_to_owner(): void
    {
        $otherUser = User::factory()->create(['role' => UserRole::User]);

        UserNotification::create([
            'user_id' => $otherUser->id,
            'type' => 'submitted',
            'message' => 'Secret notification',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertEquals(0, $response->json()['total']);
    }
}
