<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CalendarFeedTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Room $room;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $location = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);

        $this->room = Room::factory()->create([
            'location_id' => $location->id,
            'capacity' => 20,
            'is_active' => true,
        ]);

        $this->token = Str::random(64);

        $this->user = User::factory()->create([
            'role' => UserRole::User,
            'calendar_token' => $this->token,
        ]);
    }

    private function makeBooking(BookingStatus|string $status, $start = null): Booking
    {
        $start ??= now()->addDays(2)->setTime(10, 0, 0);

        return Booking::factory()->create([
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
            'title' => 'Feed Test Booking',
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(2),
            'status' => $status,
        ]);
    }

    /**
     * Test that the feed returns approved bookings as iCalendar events.
     */
    public function test_feed_returns_approved_bookings(): void
    {
        $approved = $this->makeBooking(BookingStatus::Approved);

        $response = $this->get("/calendar/feed/{$this->token}.ics");

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/calendar; charset=utf-8');

        $content = $response->getContent();

        $this->assertStringContainsString('BEGIN:VCALENDAR', $content);
        $this->assertStringContainsString('BEGIN:VEVENT', $content);
        $this->assertStringContainsString('SUMMARY:Feed Test Booking', $content);
        $this->assertStringContainsString('UID:booking-'.$approved->id.'@mimos-academy', $content);
        $this->assertStringContainsString('END:VCALENDAR', $content);
    }

    /**
     * Test that pending, rejected and cancelled bookings are excluded.
     */
    public function test_feed_excludes_non_approved_bookings(): void
    {
        $this->makeBooking(BookingStatus::Pending);
        $this->makeBooking(BookingStatus::Rejected);
        $this->makeBooking(BookingStatus::Cancelled);

        $response = $this->get("/calendar/feed/{$this->token}.ics");

        $content = $response->getContent();

        $this->assertSame(0, substr_count($content, 'BEGIN:VEVENT'));
    }

    /**
     * Test that an unknown token returns 404.
     */
    public function test_feed_unknown_token_returns_404(): void
    {
        $this->get('/calendar/feed/'.Str::random(64).'.ics')->assertNotFound();
    }

    /**
     * Test that stale bookings (older than 3 months) are not included.
     */
    public function test_feed_excludes_stale_bookings(): void
    {
        $this->makeBooking(BookingStatus::Approved, now()->subMonths(6)->setTime(10, 0, 0));

        $response = $this->get("/calendar/feed/{$this->token}.ics");

        $content = $response->getContent();

        $this->assertSame(0, substr_count($content, 'BEGIN:VEVENT'));
    }

    /**
     * Test that the subscription endpoint returns the feed URLs (auth required).
     */
    public function test_subscription_endpoint_requires_auth(): void
    {
        $this->getJson('/api/calendar/subscription')->assertStatus(401);
    }

    /**
     * Test that the subscription endpoint returns webcal + https URLs.
     */
    public function test_subscription_endpoint_returns_urls(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/calendar/subscription')
            ->assertStatus(200);

        $this->assertStringContainsString('webcal://', $response->json('feed_url'));
        $this->assertStringContainsString('https://', $response->json('https_url'));
        $this->assertStringContainsString("/calendar/feed/{$this->token}.ics", $response->json('feed_url'));
    }

    /**
     * Test that regenerating rotates the token (old feed dies, new one works).
     */
    public function test_regenerate_rotates_token(): void
    {
        $booking = $this->makeBooking(BookingStatus::Approved);

        $response = $this->actingAs($this->user)
            ->postJson('/api/calendar/subscription/regenerate')
            ->assertStatus(200);

        $newUrl = $response->json('feed_url');
        $this->assertNotEquals("/calendar/feed/{$this->token}.ics", $newUrl);

        // Old token is dead
        $this->get("/calendar/feed/{$this->token}.ics")->assertNotFound();

        // New token serves the feed
        $newToken = $this->user->fresh()->calendar_token;
        $this->assertNotNull($newToken);
        $this->get("/calendar/feed/{$newToken}.ics")
            ->assertOk()
            ->assertSee('Feed Test Booking');
    }
}
