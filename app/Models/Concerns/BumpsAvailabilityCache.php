<?php

namespace App\Models\Concerns;

use App\Services\AvailabilityCacheService;

/**
 * Bumps the availability cache generation whenever the model is saved or
 * deleted, so generation-scoped cached payloads (timeline grid, calendars,
 * room/location lists) are invalidated on any data change.
 */
trait BumpsAvailabilityCache
{
    public static function bootBumpsAvailabilityCache(): void
    {
        static::saved(fn () => app(AvailabilityCacheService::class)->bump());
        static::deleted(fn () => app(AvailabilityCacheService::class)->bump());
    }
}
