<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * GET /api/rooms (public)
     * List rooms with location info.
     */
    public function publicIndex(Request $request): JsonResponse
    {
        $query = Room::active()->with('location');

        if ($request->location_id) {
            $query->where('location_id', $request->location_id);
        }

        return response()->json($query->orderBy('name')->get());
    }

    /**
     * GET /api/admin/rooms
     * List all rooms for admin management.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = Room::with('location');

        if ($user->isLocationAdmin()) {
            $query->where('location_id', $user->location_id);
        }

        return response()->json($query->orderBy('name')->get());
    }

    /**
     * POST /api/admin/rooms
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'location_id' => 'required|exists:locations,id',
            'name' => 'required|string|max:100',
            'capacity' => 'required|integer|min:1',
            'amenities' => 'nullable|array',
            'description' => 'nullable|string|max:500',
        ]);

        // Location admins can only add rooms to their location
        if ($user->isLocationAdmin() && $validated['location_id'] !== $user->location_id) {
            return response()->json(['message' => 'You can only manage rooms at your location.'], 403);
        }

        $room = Room::create($validated);

        return response()->json($room->load('location'), 201);
    }

    /**
     * GET /api/admin/rooms/{room}
     */
    public function show(Request $request, Room $room): JsonResponse
    {
        return response()->json($room->load('location'));
    }

    /**
     * PUT /api/admin/rooms/{room}
     */
    public function update(Request $request, Room $room): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($user->isLocationAdmin() && $room->location_id !== $user->location_id) {
            return response()->json(['message' => 'You can only manage rooms at your location.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'capacity' => 'sometimes|integer|min:1',
            'amenities' => 'nullable|array',
            'description' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        $room->update($validated);

        return response()->json($room->fresh('location'));
    }

    /**
     * DELETE /api/admin/rooms/{room}
     * Soft-disable a room instead of deleting.
     */
    public function destroy(Request $request, Room $room): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($user->isLocationAdmin() && $room->location_id !== $user->location_id) {
            return response()->json(['message' => 'You can only manage rooms at your location.'], 403);
        }

        $room->update(['is_active' => false]);

        return response()->json(['message' => 'Room deactivated.']);
    }
}
