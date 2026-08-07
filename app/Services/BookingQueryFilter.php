<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;

/**
 * Shared query filters for the admin bookings list and the CSV export.
 *
 * Keeping these in one place guarantees the list and the export always
 * honour exactly the same filter semantics (no silent drift).
 */
class BookingQueryFilter
{
    /**
     * Apply the standard booking filters (status, location, room, dates,
     * time window, free-text search) plus location-admin scoping.
     */
    public static function applyBookings(Builder $query, array $filters, ?int $locationId = null, bool $isLocationAdmin = false): Builder
    {
        if ($isLocationAdmin && $locationId) {
            $query->whereHas('room', fn ($q) => $q->where('location_id', $locationId));
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['location_id'])) {
            $query->whereHas('room', fn ($q) => $q->where('location_id', $filters['location_id']));
        }
        if (! empty($filters['room_id'])) {
            $query->where('room_id', $filters['room_id']);
        }
        if (! empty($filters['date'])) {
            $query->whereDate('start_time', $filters['date']);
        }
        if (! empty($filters['date_from'])) {
            $query->whereDate('start_time', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('start_time', '<=', $filters['date_to']);
        }
        if (! empty($filters['time_filter'])) {
            if ($filters['time_filter'] === 'past') {
                $query->where('end_time', '<', now());
            } elseif ($filters['time_filter'] === 'upcoming') {
                $query->where('end_time', '>=', now());
            }
        }
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%")
                    ->orWhere('reference_no', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        return $query->orderByDesc('created_at');
    }

    /**
     * Apply the standard audit-log filters (action, free-text search) plus
     * location-admin scoping.
     */
    public static function applyAuditLogs(Builder $query, array $filters, ?int $locationId = null, bool $isLocationAdmin = false): Builder
    {
        if ($isLocationAdmin && $locationId) {
            $query->whereHas('booking.room', fn ($q) => $q->where('location_id', $locationId));
        }

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('ip_address', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('booking', function ($bq) use ($search) {
                        $bq->where('title', 'like', "%{$search}%")
                            ->orWhere('reference_no', 'like', "%{$search}%");
                    });
            });
        }

        return $query->orderByDesc('created_at');
    }
}
