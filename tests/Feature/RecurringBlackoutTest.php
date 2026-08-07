<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\Room;
use App\Models\RoomBlackout;
use App\Models\User;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringBlackoutTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $superAdmin;

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
        $this->superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
    }

    private function nextMonday(): Carbon
    {
        return now()->next(Carbon::MONDAY)->setTime(9, 0, 0);
    }

    /**
     * Test that a weekly blackout blocks matching weekdays and allows others.
     */
    public function test_weekly_blackout_blocks_matching_weekdays(): void
    {
        $firstMonday = $this->nextMonday();

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Weekly Maintenance',
            'start_time' => $firstMonday,
            'end_time' => $firstMonday->copy()->addHours(2),
            'created_by' => $this->superAdmin->id,
            'recurrence' => 'weekly',
            'recurrence_end_date' => $firstMonday->copy()->addWeeks(6)->toDateString(),
            'recurrence_weekdays' => ['mon'],
        ]);

        $service = app(AvailabilityService::class);

        // Following Monday 9–11 blocked
        $blockedStart = $firstMonday->copy()->addWeek();
        $this->assertFalse(
            $service->isAvailable($this->room->id, $blockedStart, $blockedStart->copy()->addHours(2)),
            'Recurring weekly blackout should block the following Monday'
        );

        // Wednesday of the same week is free
        $freeStart = $firstMonday->copy()->addWeek()->next(Carbon::WEDNESDAY);
        $this->assertTrue(
            $service->isAvailable($this->room->id, $freeStart, $freeStart->copy()->addHours(2)),
            'A non-matching weekday should remain available'
        );
    }

    /**
     * Test that a daily blackout blocks any day inside the range.
     */
    public function test_daily_blackout_blocks_days_in_range(): void
    {
        $tomorrow = now()->addDay()->setTime(9, 0, 0);

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'AC Works',
            'start_time' => $tomorrow,
            'end_time' => $tomorrow->copy()->addHours(3),
            'created_by' => $this->superAdmin->id,
            'recurrence' => 'daily',
            'recurrence_end_date' => $tomorrow->copy()->addDays(6)->toDateString(),
        ]);

        $service = app(AvailabilityService::class);

        $fourDaysLater = $tomorrow->copy()->addDays(4);
        $this->assertFalse(
            $service->isAvailable($this->room->id, $fourDaysLater, $fourDaysLater->copy()->addHours(1)),
            'Daily recurrence should block a day well inside the range'
        );

        // After the recurrence end date the room is available again
        $afterEnd = Carbon::parse($tomorrow->toDateString())->addDays(10)->setTime(9, 0, 0);
        $this->assertTrue(
            $service->isAvailable($this->room->id, $afterEnd, $afterEnd->copy()->addHours(1)),
            'Slot after the recurrence end date should be available'
        );
    }

    /**
     * Test that the availability search endpoint reports the recurring blackout.
     */
    public function test_availability_search_respects_recurring_blackout(): void
    {
        $firstMonday = $this->nextMonday();

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Weekly Maintenance',
            'start_time' => $firstMonday,
            'end_time' => $firstMonday->copy()->addHours(2),
            'created_by' => $this->superAdmin->id,
            'recurrence' => 'weekly',
            'recurrence_end_date' => $firstMonday->copy()->addWeeks(6)->toDateString(),
            'recurrence_weekdays' => ['mon'],
        ]);

        // Search the Monday AFTER next Monday (second occurrence)
        $searchDate = $firstMonday->copy()->addWeek();

        $response = $this->getJson('/api/availability/search?'.http_build_query([
            'date' => $searchDate->toDateString(),
            'start_time' => '09:00',
            'end_time' => '11:00',
        ]))->assertStatus(200);

        $roomEntry = collect($response->json('rooms'))->firstWhere('id', $this->room->id);
        $this->assertNotNull($roomEntry);
        $this->assertFalse($roomEntry['is_available']);
    }

    /**
     * Test that creating a booking over a recurring occurrence is blocked.
     */
    public function test_booking_over_recurring_occurrence_is_blocked(): void
    {
        $firstMonday = $this->nextMonday();

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Weekly Maintenance',
            'start_time' => $firstMonday,
            'end_time' => $firstMonday->copy()->addHours(2),
            'created_by' => $this->superAdmin->id,
            'recurrence' => 'weekly',
            'recurrence_end_date' => $firstMonday->copy()->addWeeks(6)->toDateString(),
            'recurrence_weekdays' => ['mon'],
        ]);

        $blockedDay = $firstMonday->copy()->addWeek();

        $this->actingAs($this->user)
            ->postJson('/api/bookings', [
                'room_id' => $this->room->id,
                'title' => 'Clash With Recurring Maintenance',
                'start_date' => $blockedDay->toDateString(),
                'end_date' => $blockedDay->toDateString(),
                'start_time' => $blockedDay->toDateTimeString(),
                'end_time' => $blockedDay->copy()->addHours(2)->toDateTimeString(),
                'attendees' => 5,
                'phone' => '+60123456789',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['blackout']);
    }

    /**
     * Test that the admin calendar expands recurring blackouts into occurrences.
     */
    public function test_admin_calendar_expands_recurring_blackouts(): void
    {
        $firstMonday = $this->nextMonday();

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Weekly Maintenance',
            'start_time' => $firstMonday,
            'end_time' => $firstMonday->copy()->addHours(2),
            'created_by' => $this->superAdmin->id,
            'recurrence' => 'weekly',
            'recurrence_end_date' => $firstMonday->copy()->addWeeks(4)->toDateString(),
            'recurrence_weekdays' => ['mon'],
        ]);

        // Range covers 3 Mondays: first + 2 recurrences
        $rangeStart = $firstMonday->copy()->startOfDay();
        $rangeEnd = $firstMonday->copy()->addWeeks(2)->endOfDay();

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/admin/calendar?'.http_build_query([
                'start_date' => $rangeStart->toDateString(),
                'end_date' => $rangeEnd->toDateString(),
            ]))
            ->assertStatus(200);

        $blackoutEvents = collect($response->json())->filter(fn ($e) => $e['type'] === 'blackout');

        $this->assertCount(3, $blackoutEvents, 'Calendar should expand the weekly blackout into 3 occurrences');
        $this->assertStringContainsString('Weekly Maintenance', $blackoutEvents->first()['title']);
    }

    /**
     * Test that a weekly blackout whose start day is NOT in the selected
     * weekdays still blocks the selected weekdays (anchor-day regression).
     */
    public function test_weekly_blackout_weekdays_are_not_anchored_to_start_day(): void
    {
        // Start on a Saturday but repeat on Mon/Wed
        $saturday = now()->next(Carbon::SATURDAY)->setTime(8, 0, 0);

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Weekday Maintenance',
            'start_time' => $saturday,
            'end_time' => $saturday->copy()->addHours(2),
            'created_by' => $this->superAdmin->id,
            'recurrence' => 'weekly',
            'recurrence_end_date' => $saturday->copy()->addWeeks(4)->toDateString(),
            'recurrence_weekdays' => ['mon', 'wed'],
        ]);

        $service = app(AvailabilityService::class);

        // The following Monday and Wednesday must be blocked…
        $monday = $saturday->copy()->next(Carbon::MONDAY)->setTime(8, 0);
        $this->assertFalse($service->isAvailable($this->room->id, $monday, $monday->copy()->addHour()));

        $wednesday = $saturday->copy()->next(Carbon::WEDNESDAY)->setTime(8, 0);
        $this->assertFalse($service->isAvailable($this->room->id, $wednesday, $wednesday->copy()->addHour()));

        // …but the Saturday itself (the anchor day) stays available.
        $nextSaturday = $saturday->copy()->addWeek();
        $this->assertTrue($service->isAvailable($this->room->id, $nextSaturday, $nextSaturday->copy()->addHour()));
    }

    /**
     * Test that long-running daily recurrences are correctly honoured for
     * queries far in the future (iteration skipping / guard regression).
     */
    public function test_long_running_daily_blackout_still_blocks_far_future(): void
    {
        $start = now()->addDay()->setTime(9, 0, 0);

        RoomBlackout::create([
            'room_id' => $this->room->id,
            'title' => 'Long Running Works',
            'start_time' => $start,
            'end_time' => $start->copy()->addHours(3),
            'created_by' => $this->superAdmin->id,
            'recurrence' => 'daily',
            // ~5 years of daily occurrences — far beyond the old 2000-iteration guard
            'recurrence_end_date' => $start->copy()->addYears(5)->toDateString(),
        ]);

        $service = app(AvailabilityService::class);

        // Query ~4.5 years into the recurrence
        $farFuture = $start->copy()->addYears(4)->addMonths(6)->setTime(10, 0, 0);
        $this->assertFalse(
            $service->isAvailable($this->room->id, $farFuture, $farFuture->copy()->addHour()),
            'A daily blackout must still block slots years into its recurrence'
        );
    }

    /**
     * Test that a recurring blackout created via the API stores recurrence fields.
     */
    public function test_api_creates_recurring_blackout(): void
    {
        $start = now()->addDays(2)->setTime(9, 0, 0);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/blackouts', [
                'room_id' => $this->room->id,
                'title' => 'Recurring Testing',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $start->copy()->addHours(2)->toDateTimeString(),
                'recurrence' => 'weekly',
                'recurrence_end_date' => $start->copy()->addWeeks(8)->toDateString(),
                'recurrence_weekdays' => ['tue', 'thu'],
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('room_blackouts', [
            'room_id' => $this->room->id,
            'title' => 'Recurring Testing',
            'recurrence' => 'weekly',
        ]);

        $blackout = RoomBlackout::first();
        $this->assertEquals(['tue', 'thu'], $blackout->recurrence_weekdays);
        $this->assertNotNull($blackout->recurrence_end_date);
    }

    /**
     * Test that a weekly blackout without weekdays defaults to the start day.
     */
    public function test_weekly_blackout_defaults_to_start_weekday(): void
    {
        $start = now()->addDays(2)->setTime(9, 0, 0);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/blackouts', [
                'room_id' => $this->room->id,
                'title' => 'Default Weekday',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $start->copy()->addHours(2)->toDateTimeString(),
                'recurrence' => 'weekly',
                'recurrence_end_date' => $start->copy()->addWeeks(4)->toDateString(),
            ])
            ->assertStatus(201);

        $blackout = RoomBlackout::first();
        $this->assertEquals([strtolower($start->format('D'))], $blackout->recurrence_weekdays);
    }

    /**
     * Test that a recurring blackout requires an end date.
     */
    public function test_recurring_blackout_requires_end_date(): void
    {
        $start = now()->addDays(2)->setTime(9, 0, 0);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/admin/blackouts', [
                'room_id' => $this->room->id,
                'title' => 'No End Date',
                'start_time' => $start->toDateTimeString(),
                'end_time' => $start->copy()->addHours(2)->toDateTimeString(),
                'recurrence' => 'daily',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['recurrence_end_date']);
    }
}
