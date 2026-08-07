<?php

namespace App\Http\Controllers\Api;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CalendarExportService;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class CalendarFeedController extends Controller
{
    /**
     * GET /calendar/feed/{token}.ics
     *
     * Public iCal subscription feed for a user's approved bookings.
     * The token is the unguessable secret from the user's profile — treat it
     * as a credential (regenerate it to revoke access).
     */
    public function userFeed(string $token, CalendarExportService $icsService): Response
    {
        $user = User::where('calendar_token', $token)->first();

        if (! $user) {
            abort(404, 'Calendar feed not found.');
        }

        $bookings = $user->bookings()
            ->with(['room.location', 'user'])
            ->where('status', BookingStatus::Approved)
            ->where('end_time', '>', now()->subMonths(3))
            ->orderBy('start_time')
            ->get();

        $ics = $icsService->generateFeed($bookings);

        return response($ics, SymfonyResponse::HTTP_OK, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="mimos-academy-bookings.ics"',
            'Cache-Control' => 'no-store, max-age=0',
        ]);
    }
}
