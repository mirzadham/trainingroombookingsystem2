<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /**
     * GET /api/favorites
     * List the authenticated user's favorite rooms.
     */
    public function index(Request $request): JsonResponse
    {
        $favorites = $request->user()->favoriteRooms()
            ->with('location')
            ->orderBy('favorites.created_at', 'desc')
            ->get()
            ->map(fn (Room $room) => [
                'id' => $room->id,
                'name' => $room->name,
                'capacity' => $room->capacity,
                'description' => $room->description,
                'image_url' => $room->image_url,
                'images' => $room->images,
                'location_legend' => $room->location_legend,
                'amenities' => $room->amenities ?? [],
                'location' => [
                    'id' => $room->location->id,
                    'name' => $room->location->name,
                    'code' => $room->location->code,
                ],
                'favorited_at' => $room->pivot?->created_at?->toIso8601String(),
            ]);

        return response()->json($favorites);
    }

    /**
     * POST /api/favorites/{room}
     * Add a room to favorites (idempotent).
     */
    public function store(Request $request, Room $room): JsonResponse
    {
        if (! $room->is_active) {
            return response()->json(['message' => 'This room is not available.'], 404);
        }

        Favorite::firstOrCreate([
            'user_id' => $request->user()->id,
            'room_id' => $room->id,
        ]);

        return response()->json([
            'message' => 'Room added to favorites.',
            'favorited' => true,
        ], 201);
    }

    /**
     * DELETE /api/favorites/{room}
     * Remove a room from favorites (idempotent).
     */
    public function destroy(Request $request, Room $room): JsonResponse
    {
        Favorite::where('user_id', $request->user()->id)
            ->where('room_id', $room->id)
            ->delete();

        return response()->json([
            'message' => 'Room removed from favorites.',
            'favorited' => false,
        ]);
    }
}
