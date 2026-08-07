<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * List the authenticated user's in-app notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = UserNotification::forUser($request->user()->id)
            ->with('booking:id,reference_no,title,room_id')
            ->orderByDesc('created_at')
            ->paginate(20)
            ->through(fn (UserNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'message' => $n->message,
                'data' => $n->data ?? [],
                'booking_id' => $n->booking_id,
                'booking' => $n->booking ? [
                    'id' => $n->booking->id,
                    'reference_no' => $n->booking->reference_no,
                    'title' => $n->booking->title,
                ] : null,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
            ]);

        return response()->json($notifications);
    }

    /**
     * GET /api/notifications/unread-count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = UserNotification::forUser($request->user()->id)
            ->unread()
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * POST /api/notifications/{notification}/read
     * Mark a single notification as read (owner only).
     */
    public function markRead(Request $request, UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['message' => 'Notification marked as read.']);
    }

    /**
     * POST /api/notifications/read-all
     * Mark all of the user's notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $updated = UserNotification::forUser($request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'updated' => $updated,
        ]);
    }
}
