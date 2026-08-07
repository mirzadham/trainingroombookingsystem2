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
     * Reusable query builder for booking exports — shares the exact filter
     * semantics with the admin bookings list via BookingQueryFilter.
     */
    public function filteredBookingsQuery(array $filters, ?int $locationId = null, bool $isLocationAdmin = false): Builder
    {
        return BookingQueryFilter::applyBookings(
            Booking::with(['room.location', 'user']),
            $filters,
            $locationId,
            $isLocationAdmin
        );
    }

    /**
     * Reusable query builder for audit-log exports — shares the exact filter
     * semantics with the admin audit-logs list via BookingQueryFilter.
     */
    public function filteredAuditLogsQuery(array $filters, ?int $locationId = null, bool $isLocationAdmin = false): Builder
    {
        return BookingQueryFilter::applyAuditLogs(
            AuditLog::with(['user', 'booking.room.location']),
            $filters,
            $locationId,
            $isLocationAdmin
        );
    }
}
