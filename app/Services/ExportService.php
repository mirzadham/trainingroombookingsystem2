<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportService
{
    /**
     * Stream a CSV download for a set of bookings.
     */
    public function bookingsCsv(Collection $bookings): StreamedResponse
    {
        return response()->streamDownload(function () use ($bookings) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Reference', 'Title', 'Status', 'Start Time', 'End Time',
                'Attendees', 'Phone', 'Room', 'Location',
                'Booked By', 'Email', 'Created At', 'Approved At',
                'Attendance', 'Rejection Reason', 'Cancellation Reason',
            ]);

            foreach ($bookings as $booking) {
                fputcsv($handle, [
                    $booking->reference_no,
                    $booking->title,
                    $booking->status->value,
                    $booking->start_time?->toDateTimeString(),
                    $booking->end_time?->toDateTimeString(),
                    $booking->attendees,
                    $booking->phone,
                    $booking->room?->name,
                    $booking->room?->location?->code,
                    $booking->user?->name,
                    $booking->user?->email,
                    $booking->created_at?->toDateTimeString(),
                    $booking->approved_at?->toDateTimeString(),
                    $booking->attendance_status,
                    $booking->rejection_reason,
                    $booking->cancellation_reason,
                ]);
            }

            fclose($handle);
        }, 'bookings_'.now()->format('Ymd_His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Stream a CSV download for a set of audit logs.
     */
    public function auditLogsCsv(Collection $logs): StreamedResponse
    {
        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Created At', 'Action', 'User', 'Email', 'IP Address',
                'Booking Reference', 'Booking Title', 'Changes',
            ]);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->created_at?->toDateTimeString(),
                    $log->action,
                    $log->user?->name,
                    $log->user?->email,
                    $log->ip_address,
                    $log->booking?->reference_no,
                    $log->booking?->title,
                    $log->changes ? json_encode($log->changes) : '',
                ]);
            }

            fclose($handle);
        }, 'audit_logs_'.now()->format('Ymd_His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Reusable query builder for booking exports that mirrors
     * AdminController::bookings filters.
     */
    public function filteredBookingsQuery(array $filters, ?int $locationId = null, bool $isLocationAdmin = false): Builder
    {
        $query = Booking::with(['room.location', 'user']);

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
     * Reusable query builder for audit log exports that mirrors
     * AdminController::auditLogs filters.
     */
    public function filteredAuditLogsQuery(array $filters, ?int $locationId = null, bool $isLocationAdmin = false): Builder
    {
        $query = AuditLog::with(['user', 'booking.room.location']);

        if ($isLocationAdmin && $locationId) {
            $query->whereHas('booking.room', fn ($q) => $q->where('location_id', $locationId));
        }

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('ip_address', 'like', "%{$filters['search']}%")
                    ->orWhereHas('user', function ($uq) use ($filters) {
                        $uq->where('name', 'like', "%{$filters['search']}%")
                            ->orWhere('email', 'like', "%{$filters['search']}%");
                    })
                    ->orWhereHas('booking', function ($bq) use ($filters) {
                        $bq->where('title', 'like', "%{$filters['search']}%")
                            ->orWhere('reference_no', 'like', "%{$filters['search']}%");
                    });
            });
        }

        return $query->orderByDesc('created_at');
    }
}
