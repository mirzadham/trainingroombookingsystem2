<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Generation-scoped cache for availability-facing read paths
 * (timeline grid, calendars, room/location lists).
 *
 * Every Booking / Room / RoomBlackout / Location write bumps the generation
 * counter, so cached payloads can never serve stale data after a mutation —
 * while unchanged data is served from cache instead of being recomputed on
 * every request. This works with any cache store (no tag support required).
 */
class AvailabilityCacheService
{
    private const GENERATION_KEY = 'availability_cache_generation';

    // Long TTL is fine: correctness comes from the generation bump on every
    // data mutation, not from expiry. If the key ever expires, generation()
    // falls back to 0 and the next bump re-creates it.
    private const GENERATION_TTL = 31536000; // 1 year

    /**
     * Current generation number (0 when nothing has been cached yet).
     */
    public function generation(): int
    {
        return (int) Cache::get(self::GENERATION_KEY, 0);
    }

    /**
     * Invalidate every generation-scoped payload.
     *
     * Called from model events (see BumpsAvailabilityCache) whenever a
     * booking, room, blackout or location is created/updated/deleted.
     */
    public function bump(): void
    {
        // Ensure the counter key exists first (insert-only): the database
        // cache store's increment() is an UPDATE, which silently no-ops on
        // a missing key, and overwriting it here would reset the counter.
        Cache::add(self::GENERATION_KEY, 0, self::GENERATION_TTL);
        Cache::increment(self::GENERATION_KEY);
    }

    /**
     * Cache $callback's result under a generation-scoped key.
     */
    public function remember(string $key, int $seconds, callable $callback): mixed
    {
        return Cache::remember($this->key($key), $seconds, $callback);
    }

    /**
     * The generation-scoped cache key for $key.
     */
    public function key(string $key): string
    {
        return "availability:v{$this->generation()}:{$key}";
    }
}
