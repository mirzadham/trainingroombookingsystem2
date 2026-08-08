<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\User;
use App\Services\AvailabilityCacheService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location_id' => 'nullable|exists:locations,id',
            'room_id' => 'nullable|exists:rooms,id',
        ]);

        $events = app(AvailabilityCacheService::class)->remember(
            'calendar:'.$request->start_date.':'.$request->end_date
                .':'.($request->location_id ?? 'all').':'.($request->room_id ?? 'all'),
            3600,
            function () use ($request) {
                $query = Booking::approved()
                    ->with(['room.location', 'user:id,name,email'])
                    ->where('start_time', '>=', $request->start_date)
                    ->where('end_time', '<=', Carbon::parse($request->end_date)->endOfDay());

                if ($request->location_id) {
                    $query->whereHas('room', fn ($q) => $q->where('location_id', $request->location_id));
                }
                if ($request->room_id) {
                    $query->where('room_id', $request->room_id);
                }

                return $query->orderBy('start_time')->get()->map(fn ($b) => [
                    'id' => $b->id,
                    'title' => $b->title,
                    'start' => $b->start_time->toIso8601String(),
                    'end' => $b->end_time->toIso8601String(),
                    'room' => $b->room->name,
                    'room_id' => $b->room_id,
                    'location' => $b->room->location->code,
                    'booked_by' => $b->user->name,
                    'booked_by_email' => $b->user->email,
                    'group_id' => $b->group_id,
                ]);
            }
        );

        return response()->json($events);
    }

    /**
     * GET /api/calendar/subscription
     * Returns the user's private iCal subscription URL (webcal + https).
     */
    public function subscription(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->getOrCreateCalendarToken();

        return response()->json([
            'feed_url' => $this->feedUrl($token, 'webcal'),
            'https_url' => $this->feedUrl($token, 'https'),
        ]);
    }

    /**
     * POST /api/calendar/subscription/regenerate
     * Rotates the feed token (old links stop working immediately).
     */
    public function regenerate(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->regenerateCalendarToken();

        return response()->json([
            'feed_url' => $this->feedUrl($token, 'webcal'),
            'https_url' => $this->feedUrl($token, 'https'),
        ]);
    }

    private function feedUrl(string $token, string $scheme): string
    {
        // getHttpHost() keeps the port (unlike getHost()) so links work on
        // non-standard ports (e.g. localhost:8000 during development).
        $host = request()->getHttpHost() ?? 'localhost';

        return "{$scheme}://{$host}/calendar/feed/{$token}.ics";
    }
}
