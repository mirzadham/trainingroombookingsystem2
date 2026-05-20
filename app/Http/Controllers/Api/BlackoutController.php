<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomBlackout;
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

        $blackouts = $query->orderByDesc('start_time')->get();

        return response()->json($blackouts);
    }

    /**
     * POST /api/admin/blackouts
     * Create a new blackout period for a room.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'title' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        $user = $request->user();
        $room = Room::findOrFail($validated['room_id']);

        // Check if Location Admin has access to this room's location
        if ($user->isLocationAdmin() && $room->location_id !== $user->location_id) {
            throw ValidationException::withMessages([
                'room_id' => 'You do not have administrative access to this room\'s location.',
            ]);
        }

        $blackout = RoomBlackout::create([
            'room_id' => $validated['room_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'created_by' => $user->id,
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

        // Check if Location Admin has access to this room's location
        if ($user->isLocationAdmin() && $room->location_id !== $user->location_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $blackout->delete();

        return response()->json([
            'message' => 'Blackout window removed successfully.',
        ]);
    }
}
