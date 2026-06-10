<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\StoreRoomRequest;
use App\Http\Requests\Room\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

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

        Cache::forget("room_images_gallery:{$room->id}");

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

    /**
     * POST /api/admin/rooms/{room}/toggle-active
     * Toggle a room's active status (activate/deactivate).
     */
    public function toggleActive(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $room->update(['is_active' => !$room->is_active]);

        $status = $room->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'message' => "Room {$status} successfully.",
            'room' => new RoomResource($room->load('location')),
        ]);
    }

    /**
     * POST /api/admin/rooms/{room}/images
     * Upload one or more photos for a room.
     */
    public function uploadImage(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $request->validate([
            'files' => 'required|array',
            'files.*' => 'required|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
        ]);

        $uploadedImages = [];
        $diskName = env('FILESYSTEM_DISK', 's3');
        $disk = Storage::disk($diskName);

        foreach ($request->file('files') as $file) {
            $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $cleanName = preg_replace('/[^a-zA-Z0-9_]/', '_', $originalName);
            $extension = $file->getClientOriginalExtension();
            $filename = time() . '_' . uniqid() . '_' . $cleanName . '.' . $extension;

            $path = "rooms/{$room->id}/{$filename}";
            
            // Put file onto the configured disk (S3/R2 or local public)
            $disk->put($path, file_get_contents($file), 'public');
            
            // Store the full URL to the database
            $uploadedImages[] = $disk->url($path);
        }

        // Set cover image automatically if the room doesn't have a custom one
        if (empty($room->image_url) || !preg_match('/\/rooms\/\d+\//', $room->image_url)) {
            if (!empty($uploadedImages)) {
                $room->update(['image_url' => $uploadedImages[0]]);
            }
        }

        Cache::forget("room_images_gallery:{$room->id}");

        return response()->json([
            'message' => 'Images uploaded successfully.',
            'image_url' => $room->image_url,
            'images' => $room->fresh()->images,
        ]);
    }

    /**
     * DELETE /api/admin/rooms/{room}/images
     * Delete an uploaded photo from disk.
     */
    public function deleteImage(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $request->validate([
            'image_path' => 'required|string',
        ]);

        $imagePath = $request->input('image_path');
        
        $diskName = env('FILESYSTEM_DISK', 's3');
        $disk = Storage::disk($diskName);
        $parsedUrl = parse_url($imagePath, PHP_URL_PATH);
        $relativeKey = ltrim($parsedUrl, '/');

        // If local storage is used, the URL has "/storage/rooms/..." prefix
        if ($diskName === 'public' && str_starts_with($relativeKey, 'storage/')) {
            $relativeKey = substr($relativeKey, 8);
        }

        // Security check: ensure the image path belongs to this room
        if (!str_starts_with($relativeKey, "rooms/{$room->id}/")) {
            return response()->json(['message' => 'Unauthorized action. Invalid image path.'], 403);
        }

        if ($disk->exists($relativeKey)) {
            $disk->delete($relativeKey);
        }

        // Re-assign cover photo if the deleted image was primary
        if ($room->image_url === $imagePath) {
            $remaining = $room->images;
            $remaining = array_values(array_filter($remaining, function($img) use ($imagePath) {
                return $img !== $imagePath;
            }));

            if (!empty($remaining)) {
                $room->update(['image_url' => $remaining[0]]);
            } else {
                $room->update(['image_url' => '/images/rooms/default.png']);
            }
        }

        Cache::forget("room_images_gallery:{$room->id}");

        return response()->json([
            'message' => 'Image deleted successfully.',
            'image_url' => $room->fresh()->image_url,
            'images' => $room->fresh()->images,
        ]);
    }

    /**
     * POST /api/admin/rooms/{room}/images/set-primary
     * Select which image should be the primary cover image.
     */
    public function setPrimaryImage(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $request->validate([
            'image_path' => 'required|string',
        ]);

        $imagePath = $request->input('image_path');
        
        $diskName = env('FILESYSTEM_DISK', 's3');
        $disk = Storage::disk($diskName);
        $parsedUrl = parse_url($imagePath, PHP_URL_PATH);
        $relativeKey = ltrim($parsedUrl, '/');

        // If local storage is used, the URL has "/storage/rooms/..." prefix
        if ($diskName === 'public' && str_starts_with($relativeKey, 'storage/')) {
            $relativeKey = substr($relativeKey, 8);
        }

        // Security check: ensure the image path belongs to this room
        if (!str_starts_with($relativeKey, "rooms/{$room->id}/")) {
            return response()->json(['message' => 'Unauthorized action. Invalid image path.'], 403);
        }

        if (!$disk->exists($relativeKey)) {
            return response()->json(['message' => 'Image file not found on server.'], 404);
        }

        $room->update(['image_url' => $imagePath]);

        Cache::forget("room_images_gallery:{$room->id}");

        return response()->json([
            'message' => 'Cover image updated successfully.',
            'image_url' => $room->image_url,
            'images' => $room->images,
        ]);
    }
}
