<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExportService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminExportController extends Controller
{
    /**
     * GET /api/admin/bookings/export
     * Export bookings (same filters as the list endpoint) as a CSV file.
     */
    public function bookings(Request $request, ExportService $exportService): StreamedResponse
    {
        $user = $request->user();

        $bookings = $exportService->filteredBookingsQuery(
            $request->only(['status', 'location_id', 'room_id', 'date', 'date_from', 'date_to', 'time_filter', 'search']),
            $user->location_id,
            $user->isLocationAdmin()
        )->get();

        return $exportService->bookingsCsv($bookings);
    }

    /**
     * GET /api/admin/audit-logs/export
     * Export audit logs (same filters as the list endpoint) as a CSV file.
     */
    public function auditLogs(Request $request, ExportService $exportService): StreamedResponse
    {
        $user = $request->user();

        $logs = $exportService->filteredAuditLogsQuery(
            $request->only(['action', 'search']),
            $user->location_id,
            $user->isLocationAdmin()
        )->get();

        return $exportService->auditLogsCsv($logs);
    }
}
