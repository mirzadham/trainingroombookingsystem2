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
     * Stream a CSV download for a set of bookings (already in memory).
     */
    public function bookingsCsv(Collection $bookings): StreamedResponse
    {
        return response()->streamDownload(function () use ($bookings) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, $this->bookingsCsvHeaders());

            foreach ($bookings as $booking) {
                fputcsv($handle, $this->bookingsCsvRow($booking));
            }

            fclose($handle);
        }, 'bookings_'.now()->format('Ymd_His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Stream a CSV download for a booking QUERY, fetching rows in chunks so
     * memory stays bounded no matter how large the result set is.
     */
    public function streamBookingsCsv(Builder $query): StreamedResponse
    {
        return $this->streamCsv(
            $query,
            $this->bookingsCsvHeaders(),
            fn (Booking $booking) => $this->bookingsCsvRow($booking),
            'bookings_'.now()->format('Ymd_His').'.csv'
        );
    }

    /**
     * Stream a CSV download for a set of audit logs (already in memory).
     */
    public function auditLogsCsv(Collection $logs): StreamedResponse
    {
        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, $this->auditLogsCsvHeaders());

            foreach ($logs as $log) {
                fputcsv($handle, $this->auditLogsCsvRow($log));
            }

            fclose($handle);
        }, 'audit_logs_'.now()->format('Ymd_His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Stream a CSV download for an audit-log QUERY, fetching rows in chunks
     * so memory stays bounded no matter how large the result set is.
     */
    public function streamAuditLogsCsv(Builder $query): StreamedResponse
    {
        return $this->streamCsv(
            $query,
            $this->auditLogsCsvHeaders(),
            fn (AuditLog $log) => $this->auditLogsCsvRow($log),
            'audit_logs_'.now()->format('Ymd_His').'.csv'
        );
    }

    /**
     * Stream a CSV download for a query, fetching rows in chunks so memory
     * stays bounded no matter how large the result set is.
     */
    private function streamCsv(Builder $query, array $headers, callable $row, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($query, $headers, $row) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, $headers);

            $query->chunkById(200, function (Collection $items) use ($handle, $row) {
                foreach ($items as $item) {
                    fputcsv($handle, $row($item));
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function bookingsCsvHeaders(): array
    {
        return [
            'Reference', 'Title', 'Status', 'Start Time', 'End Time',
            'Attendees', 'Phone', 'Room', 'Location',
            'Booked By', 'Email', 'Created At', 'Approved At',
            'Attendance', 'Rejection Reason', 'Cancellation Reason',
        ];
    }

    private function bookingsCsvRow(Booking $booking): array
    {
        return [
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
        ];
    }

    private function auditLogsCsvHeaders(): array
    {
        return [
            'Created At', 'Action', 'User', 'Email', 'IP Address',
            'Booking Reference', 'Booking Title', 'Changes',
        ];
    }

    private function auditLogsCsvRow(AuditLog $log): array
    {
        return [
            $log->created_at?->toDateTimeString(),
            $log->action,
            $log->user?->name,
            $log->user?->email,
            $log->ip_address,
            $log->booking?->reference_no,
            $log->booking?->title,
            $log->changes ? json_encode($log->changes) : '',
        ];
    }

    /**
     * Reusable query builder for booking exports — shares the exact filter
     * semantics with the admin bookings list via BookingQueryFilter.
     */
    public function filteredBookingsQuery(array $filters, ?int $locationId = null, bool $isLocationAdmin = false, ?array $roomIds = null): Builder
    {
        return BookingQueryFilter::applyBookings(
            Booking::with(['room.location', 'user']),
            $filters,
            $locationId,
            $isLocationAdmin,
            $roomIds
        );
    }

    /**
     * Reusable query builder for audit-log exports — shares the exact filter
     * semantics with the admin audit-logs list via BookingQueryFilter.
     */
    public function filteredAuditLogsQuery(array $filters, ?int $locationId = null, bool $isLocationAdmin = false, ?array $roomIds = null): Builder
    {
        return BookingQueryFilter::applyAuditLogs(
            AuditLog::with(['user', 'booking.room.location']),
            $filters,
            $locationId,
            $isLocationAdmin,
            $roomIds
        );
    }
}
