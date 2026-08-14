<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomBlackout;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BlackoutController extends Controller
{
    /**
     * GET /api/admin/blackouts
     * List all blackout periods, filtered by room_id or scoped by location_id for Location Admins.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = RoomBlackout::with(['room.location', 'creator']);

        if ($request->room_id) {
            $query->where('room_id', $request->room_id);
        }

        if ($user->isLocationAdmin()) {
            $query->whereHas('room', function ($q) use ($user) {
                $q->where('location_id', $user->location_id);
            });
        }

        if ($user->isRoomAdmin()) {
            $query->whereIn('room_id', $user->adminRoomIds());
        }

        $blackouts = $query->orderByDesc('start_time')->get();

        return response()->json($blackouts);
    }

    /**
     * POST /api/admin/blackouts
     * Create a new blackout period for a room (one-off or recurring).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'title' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'recurrence' => 'nullable|in:none,daily,weekly,monthly',
            'recurrence_end_date' => 'required_if:recurrence,weekly|required_if:recurrence,daily|required_if:recurrence,monthly|nullable|date|after_or_equal:start_time',
            'recurrence_weekdays' => 'nullable|array',
            'recurrence_weekdays.*' => 'in:mon,tue,wed,thu,fri,sat,sun',
        ]);

        $user = $request->user();
        $room = Room::findOrFail($validated['room_id']);

        // Check if this admin has access to the room
        if (! $user->hasRoomAccess($room)) {
            throw ValidationException::withMessages([
                'room_id' => 'You do not have administrative access to this room.',
            ]);
        }

        $recurrence = $validated['recurrence'] ?? 'none';

        // A recurring blackout must have an end date
        if ($recurrence !== 'none' && empty($validated['recurrence_end_date'])) {
            throw ValidationException::withMessages([
                'recurrence_end_date' => 'A repeat end date is required for recurring blackouts.',
            ]);
        }

        // Weekly repeats need at least one weekday selected (defaults to the start day)
        $weekdays = $validated['recurrence_weekdays'] ?? null;
        if ($recurrence === 'weekly' && empty($weekdays)) {
            $weekdays = [strtolower(Carbon::parse($validated['start_time'])->format('D'))];
        }

        $blackout = RoomBlackout::create([
            'room_id' => $validated['room_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'created_by' => $user->id,
            'recurrence' => $recurrence,
            'recurrence_end_date' => $recurrence !== 'none' ? $validated['recurrence_end_date'] : null,
            'recurrence_weekdays' => $recurrence === 'weekly' ? $weekdays : null,
        ]);

        return response()->json([
            'message' => 'Blackout window scheduled successfully.',
            'blackout' => $blackout->load(['room.location', 'creator']),
        ], 201);
    }

    /**
     * DELETE /api/admin/blackouts/{blackout}
     * Cancel a scheduled blackout.
     */
    public function destroy(Request $request, RoomBlackout $blackout): JsonResponse
    {
        $user = $request->user();
        $room = $blackout->room;

        // Check if this admin has access to the room
        if (! $user->hasRoomAccess($room)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $blackout->delete();

        return response()->json([
            'message' => 'Blackout window removed successfully.',
        ]);
    }
}
