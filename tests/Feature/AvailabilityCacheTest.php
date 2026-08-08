<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AvailabilityCacheTest extends TestCase
{
    use RefreshDatabase;

    private Location $location;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $this->location = Location::factory()->create(['name' => 'TPM', 'code' => 'TPM']);
        $this->room = Room::factory()->create([
            'location_id' => $this->location->id,
            'capacity' => 20,
        ]);
    }

    private function gridDate(): Carbon
    {
        return now()->addDays(30)->startOfDay();
    }

    /**
     * The second timeline grid call for the same date must come from cache
     * (zero database queries) instead of rebuilding the grid.
     */
    public function test_timeline_grid_second_call_comes_from_cache(): void
    {
        $service = app(AvailabilityService::class);
        $date = $this->gridDate();

        $service->getTimelineGrid($this->location->id, $date);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $service->getTimelineGrid($this->location->id, $date);

        $this->assertCount(0, DB::getQueryLog());
    }

    /**
     * Creating an approved booking must invalidate the cached grid so the
     * occupied slot shows up on the next read.
     */
    public function test_timeline_grid_is_invalidated_by_new_booking(): void
    {
        $service = app(AvailabilityService::class);
        $date = $this->gridDate();

        // Warm the cache with an empty timeline.
        $grid = $service->getTimelineGrid($this->location->id, $date);
        $this->assertSame('available', $grid['grid'][0]['slots'][0]['status']);

        // Booking 09:00–10:30 — the generation bump must invalidate the grid.
        Booking::factory()->create([
            'room_id' => $this->room->id,
            'status' => BookingStatus::Approved,
            'start_time' => $date->copy()->setTime(9, 0),
            'end_time' => $date->copy()->setTime(10, 30),
        ]);

        $grid = $service->getTimelineGrid($this->location->id, $date);

        $occupied = collect($grid['grid'][0]['slots'])
            ->firstWhere('status', 'occupied');

        $this->assertNotNull($occupied, 'Expected a slot to become occupied after the booking was created.');
        $this->assertSame($this->room->id, $grid['grid'][0]['room']['id']);
    }

    /**
     * Deactivating a room must invalidate the cached grid so the room
     * disappears from the timeline on the next read.
     */
    public function test_timeline_grid_is_invalidated_by_room_deactivation(): void
    {
        $service = app(AvailabilityService::class);
        $date = $this->gridDate();

        $grid = $service->getTimelineGrid($this->location->id, $date);
        $this->assertCount(1, $grid['grid']);

        $this->room->update(['is_active' => false]);

        $grid = $service->getTimelineGrid($this->location->id, $date);

        $this->assertCount(0, $grid['grid']);
    }

    /**
     * The public calendar endpoint must reflect a newly approved booking,
     * even after a previous request warmed the cache.
     */
    public function test_public_calendar_reflects_new_booking(): void
    {
        $start = now()->addDays(2)->setTime(10, 0, 0);
        $end = $start->copy()->addHours(2);

        $this->getJson('/api/calendar?start_date='.$start->toDateString().'&end_date='.$end->toDateString())
            ->assertOk()
            ->assertJsonCount(0);

        Booking::factory()->create([
            'room_id' => $this->room->id,
            'status' => BookingStatus::Approved,
            'start_time' => $start,
            'end_time' => $end,
        ]);

        $this->getJson('/api/calendar?start_date='.$start->toDateString().'&end_date='.$end->toDateString())
            ->assertOk()
            ->assertJsonCount(1);
    }
}
