<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Services\AvailabilityCacheService;
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

    /**
     * Production runs CACHE_STORE=database, but phpunit forces the array
     * store — so the database store's add/increment semantics that bump()
     * was designed around (increment is a transactional UPDATE that no-ops
     * on a missing key; add is insert-only) are never exercised elsewhere.
     * Smoke-test the full counter + remember() round-trip on that store.
     */
    public function test_generation_bump_works_on_database_cache_store(): void
    {
        config()->set('cache.default', 'database');

        try {
            $svc = app(AvailabilityCacheService::class);

            // Fresh cache table: the counter key does not exist yet.
            Cache::forget('availability_cache_generation');

            // First bump must CREATE the counter via add + increment.
            $svc->bump();
            $this->assertSame(1, $svc->generation());

            // Subsequent bumps must keep incrementing — never reset to 1.
            $svc->bump();
            $svc->bump();
            $this->assertSame(3, $svc->generation());

            // remember() must round-trip through the database store under
            // the current generation.
            $this->assertSame(
                ['ok' => true],
                $svc->remember('smoke:key', 60, fn () => ['ok' => true])
            );
            $this->assertTrue(Cache::has('availability:v3:smoke:key'));
        } finally {
            // Restore the array store for the rest of the test process.
            config()->set('cache.default', 'array');
        }
    }

    /**
     * Regression: cached payloads must be plain arrays, never Eloquent
     * objects. The database cache store refuses to unserialize PHP classes
     * (serializable_classes => false), so object payloads come back as
     * __PHP_Incomplete_Class and the /api/locations response becomes an
     * object — which crashes the frontend's locations?.find().
     */
    public function test_locations_endpoint_returns_array_from_database_cache(): void
    {
        config()->set('cache.default', 'database');

        try {
            // Warm the cache (first request)…
            $this->getJson('/api/locations')->assertOk()->assertJsonIsArray();

            // …and read it back from the database store — must still be an array.
            $response = $this->getJson('/api/locations');

            $response->assertOk()->assertJsonIsArray();
            $this->assertSame('array', gettype(json_decode($response->getContent(), true)));
        } finally {
            config()->set('cache.default', 'array');
        }
    }

    /**
     * Regression: the public calendar endpoint must return a JSON array even
     * when served from the database cache store. The pre-fix controller
     * cached an Eloquent Collection, which the store restores as
     * __PHP_Incomplete_Class — the JSON object crashed CalendarPage's
     * rawEvents.forEach() (TypeError: W.forEach is not a function).
     */
    public function test_public_calendar_returns_array_from_database_cache(): void
    {
        config()->set('cache.default', 'database');

        try {
            $start = now()->addDays(5)->setTime(9, 0);
            $end = $start->copy()->addHours(1);

            Booking::factory()->create([
                'room_id' => $this->room->id,
                'status' => BookingStatus::Approved,
                'start_time' => $start,
                'end_time' => $end,
            ]);

            // Warm the cache (first request)…
            $this->getJson('/api/calendar?start_date='.$start->toDateString().'&end_date='.$end->toDateString())
                ->assertOk()
                ->assertJsonIsArray()
                ->assertJsonCount(1);

            // …and read it back from the database store — must still be an array.
            $response = $this->getJson('/api/calendar?start_date='.$start->toDateString().'&end_date='.$end->toDateString());
            $response->assertOk()->assertJsonIsArray();
            $this->assertSame('array', gettype(json_decode($response->getContent(), true)));
        } finally {
            config()->set('cache.default', 'array');
        }
    }

    /**
     * Regression: the admin calendar endpoint must return a JSON array even
     * when served from the database cache store — same class of bug as the
     * public calendar (cached Eloquent Collection → __PHP_Incomplete_Class).
     */
    public function test_admin_calendar_returns_array_from_database_cache(): void
    {
        config()->set('cache.default', 'database');

        try {
            $start = now()->addDays(5)->setTime(9, 0);
            $end = $start->copy()->addHours(1);

            $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);

            Booking::factory()->create([
                'room_id' => $this->room->id,
                'user_id' => $admin->id,
                'status' => BookingStatus::Approved,
                'start_time' => $start,
                'end_time' => $end,
            ]);

            $url = '/api/admin/calendar?start_date='.$start->toDateString().'&end_date='.$end->toDateString();

            // Warm the cache (first request)…
            $this->actingAs($admin)->getJson($url)
                ->assertOk()
                ->assertJsonIsArray()
                ->assertJsonCount(1);

            // …and read it back from the database store — must still be an array.
            $response = $this->actingAs($admin)->getJson($url);
            $response->assertOk()->assertJsonIsArray();
            $this->assertSame('array', gettype(json_decode($response->getContent(), true)));
        } finally {
            config()->set('cache.default', 'array');
        }
    }

    /**
     * Regression: remember() must self-heal corrupted cache entries. If a
     * payload was (mistakenly) written as a PHP class object, the database
     * store's serializable_classes => false setting restores it as an
     * __PHP_Incomplete_Class. Such entries must be treated as a miss and
     * rebuilt — never served to callers.
     */
    public function test_remember_self_heals_incomplete_class_entries(): void
    {
        config()->set('cache.default', 'database');

        try {
            $svc = app(AvailabilityCacheService::class);
            $cacheKey = $svc->key('self-heal:key');

            // Simulate a payload written by the pre-fix code: a serialized
            // Eloquent Collection. The store refuses to restore the class,
            // so this reads back as __PHP_Incomplete_Class.
            Cache::put($cacheKey, collect([['id' => 1]]), 60);
            $this->assertInstanceOf(\__PHP_Incomplete_Class::class, Cache::get($cacheKey));

            // remember() must detect the corruption, drop it, and rebuild.
            $value = $svc->remember('self-heal:key', 60, fn () => [['id' => 2]]);

            $this->assertSame([['id' => 2]], $value);
            $this->assertSame([['id' => 2]], Cache::get($cacheKey));
        } finally {
            config()->set('cache.default', 'array');
        }
    }
}
