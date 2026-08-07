<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WaitlistEntry;
use App\Services\WaitlistService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaitlistController extends Controller
{
    public function __construct(
        private WaitlistService $waitlistService
    ) {}

    /**
     * GET /api/waitlist
     * List the authenticated user's waitlist entries (with room info).
     */
    public function index(Request $request): JsonResponse
    {
        $entries = $request->user()->waitlistEntries()
            ->with(['room.location'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'room_id' => $entry->room_id,
                'room' => [
                    'id' => $entry->room->id,
                    'name' => $entry->room->name,
                    'capacity' => $entry->room->capacity,
                    'image_url' => $entry->room->image_url,
                    'location' => [
                        'name' => $entry->room->location->name,
                        'code' => $entry->room->location->code,
                    ],
                ],
                'start_time' => $entry->start_time->toIso8601String(),
                'end_time' => $entry->end_time->toIso8601String(),
                'attendees' => $entry->attendees,
                'status' => $entry->status->value,
                'notified_at' => $entry->notified_at?->toIso8601String(),
                'created_at' => $entry->created_at?->toIso8601String(),
            ]);

        return response()->json($entries);
    }

    /**
     * POST /api/waitlist
     * Join the waitlist for a room + time slot.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'attendees' => 'nullable|integer|min:1',
        ]);

        $entry = $this->waitlistService->join(
            $request->user(),
            (int) $validated['room_id'],
            Carbon::parse($validated['start_time']),
            Carbon::parse($validated['end_time']),
            isset($validated['attendees']) ? (int) $validated['attendees'] : null
        );

        return response()->json([
            'message' => 'You have joined the waitlist. You will be notified if this slot becomes available.',
            'waitlist' => $entry->load('room'),
        ], 201);
    }

    /**
     * DELETE /api/waitlist/{waitlistEntry}
     * Leave the waitlist (owner only).
     */
    public function destroy(Request $request, WaitlistEntry $waitlistEntry): JsonResponse
    {
        if ($waitlistEntry->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $this->waitlistService->leave($waitlistEntry, $request->user());

        return response()->json([
            'message' => 'You have left the waitlist.',
        ]);
    }
}
