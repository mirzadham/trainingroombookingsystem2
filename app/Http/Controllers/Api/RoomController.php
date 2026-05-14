<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\StoreRoomRequest;
use App\Http\Requests\Room\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
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

        return response()->json(
            RoomResource::collection($query->orderBy('name')->get())
        );
    }

    /**
     * GET /api/rooms/{room} (public)
     * Show a specific room with location info.
     */
    public function publicShow(Request $request, Room $room): JsonResponse
    {
        if (!$room->is_active) {
            abort(404, 'Room not found.');
        }
        return (new RoomResource($room->load('location')))->response();
    }

    /**
     * GET /api/admin/rooms
     * List all rooms for admin management.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Room::with('location');

        if ($user->isLocationAdmin()) {
            $query->where('location_id', $user->location_id);
        }

        return response()->json(
            RoomResource::collection($query->orderBy('name')->get())
        );
    }

    /**
     * POST /api/admin/rooms
     */
    public function store(StoreRoomRequest $request): JsonResponse
    {
        $room = Room::create($request->validated());

        return (new RoomResource($room->load('location')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/admin/rooms/{room}
     */
    public function show(Request $request, Room $room): JsonResponse
    {
        return (new RoomResource($room->load('location')))->response();
    }

    /**
     * PUT /api/admin/rooms/{room}
     */
    public function update(UpdateRoomRequest $request, Room $room): JsonResponse
    {
        $room->update($request->validated());

        return (new RoomResource($room->fresh('location')))->response();
    }

    /**
     * DELETE /api/admin/rooms/{room}
     * Soft-disable a room instead of deleting.
     */
    public function destroy(Request $request, Room $room): JsonResponse
    {
        $this->authorize('delete', $room);

        $room->update(['is_active' => false]);

        return response()->json(['message' => 'Room deactivated.']);
    }
}
