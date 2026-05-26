<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminUpdateBookingRequest;
use App\Http\Requests\Admin\RejectBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\ApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function __construct(
        private ApprovalService $approvalService
    ) {}

    /**
     * GET /api/admin/bookings
     * List all bookings (scoped by location for location admins).
     */
    public function bookings(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Booking::with(['room.location', 'user', 'approver']);

        // Location admins can only see bookings for their location
        if ($user->isLocationAdmin()) {
            $query->whereHas('room', function ($q) use ($user) {
                $q->where('location_id', $user->location_id);
            });
        }

        // Filters
        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->location_id) {
            $query->whereHas('room', function ($q) use ($request) {
                $q->where('location_id', $request->location_id);
            });
        }
        if ($request->room_id) {
            $query->where('room_id', $request->room_id);
        }
        if ($request->date) {
            $query->whereDate('start_time', $request->date);
        }
        if ($request->date_from) {
            $query->whereDate('start_time', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('start_time', '<=', $request->date_to);
        }
        if ($request->time_filter) {
            if ($request->time_filter === 'past') {
                $query->where('end_time', '<', now());
            } elseif ($request->time_filter === 'upcoming') {
                $query->where('end_time', '>=', now());
            }
        }
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $bookings = $query->orderByDesc('created_at')->paginate(20);

        return response()->json($bookings);
    }

    /**
     * POST /api/admin/bookings/{booking}/approve
     */
    public function approve(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('approve', $booking);

        $booking = $this->approvalService->approve($booking, $request->user());

        return response()->json([
            'message' => 'Booking approved successfully.',
            'booking' => new BookingResource($booking),
        ]);
    }

    /**
     * POST /api/admin/bookings/{booking}/reject
     */
    public function reject(RejectBookingRequest $request, Booking $booking): JsonResponse
    {
        $this->authorize('reject', $booking);

        $booking = $this->approvalService->reject(
            $booking,
            $request->user(),
            $request->validated()['reason']
        );

        return response()->json([
            'message' => 'Booking rejected.',
            'booking' => new BookingResource($booking),
        ]);
    }

    /**
     * PUT /api/admin/bookings/{booking}
     * Admin edits a booking (must re-validate availability).
     */
    public function updateBooking(AdminUpdateBookingRequest $request, Booking $booking): JsonResponse
    {
        $this->authorize('adminUpdate', $booking);

        $booking = $this->approvalService->adminUpdate($booking, $request->validated(), $request->user());

        return (new BookingResource($booking))->response();
    }

    /**
     * POST /api/admin/bookings/{booking}/cancel
     * Admin cancels an approved booking with mandatory remarks.
     */
    public function cancelBooking(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $request->validate([
            'remarks' => 'required|string|max:1000',
        ]);

        $booking = $this->approvalService->adminCancel(
            $booking,
            $request->user(),
            $request->remarks
        );

        return response()->json([
            'message' => 'Booking cancelled successfully.',
            'booking' => new BookingResource($booking),
        ]);
    }

    /**
     * GET /api/admin/dashboard
     * Dashboard statistics.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        $baseQuery = Booking::query();

        if ($user->isLocationAdmin()) {
            $baseQuery->whereHas('room', function ($q) use ($user) {
                $q->where('location_id', $user->location_id);
            });
        }

        $stats = [
            'pending_count' => (clone $baseQuery)->pending()->count(),
            'today_bookings' => (clone $baseQuery)->approved()
                ->whereDate('start_time', today())
                ->count(),
            'this_month_bookings' => (clone $baseQuery)
                ->whereMonth('start_time', now()->month)
                ->whereYear('start_time', now()->year)
                ->count(),
            'total_rooms' => $user->isSuperAdmin()
                ? \App\Models\Room::active()->count()
                : \App\Models\Room::active()->where('location_id', $user->location_id)->count(),
        ];

        // Recent bookings
        $recentBookings = (clone $baseQuery)
            ->with(['room.location', 'user'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'stats' => $stats,
            'recent_bookings' => BookingResource::collection($recentBookings),
        ]);
    }

    /**
     * POST /api/admin/bookings/batch-approve
     * Approve multiple bookings at once.
     */
    public function batchApprove(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:bookings,id',
        ]);

        $user = $request->user();
        $results = [
            'success' => [],
            'failed' => [],
        ];

        $bookings = Booking::with(['room.location', 'user', 'approver'])
            ->whereIn('id', $request->ids)
            ->get()
            ->keyBy('id');

        foreach ($request->ids as $id) {
            $booking = $bookings->get($id);

            try {
                $this->authorize('approve', $booking);
                $this->approvalService->approve($booking, $user);
                $results['success'][] = [
                    'id' => $id,
                    'title' => $booking->title,
                ];
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'id' => $id,
                    'title' => $booking?->title ?? "Booking #{$id}",
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => 'Batch approval completed.',
            'results' => $results,
        ]);
    }

    /**
     * POST /api/admin/bookings/batch-reject
     * Reject multiple bookings at once with a shared reason.
     */
    public function batchReject(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:bookings,id',
            'reason' => 'required|string|max:1000',
        ]);

        $user = $request->user();
        $reason = $request->reason;
        $results = [
            'success' => [],
            'failed' => [],
        ];

        $bookings = Booking::with(['room.location', 'user', 'approver'])
            ->whereIn('id', $request->ids)
            ->get()
            ->keyBy('id');

        foreach ($request->ids as $id) {
            $booking = $bookings->get($id);

            try {
                $this->authorize('reject', $booking);
                $this->approvalService->reject($booking, $user, $reason);
                $results['success'][] = [
                    'id' => $id,
                    'title' => $booking->title,
                ];
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'id' => $id,
                    'title' => $booking?->title ?? "Booking #{$id}",
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => 'Batch rejection completed.',
            'results' => $results,
        ]);
    }

    /**
     * GET /api/admin/audit-logs
     * Retrieve paginated system audit logs, scoped by location for location admins.
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = \App\Models\AuditLog::with(['user', 'booking.room.location']);

        if ($user->isLocationAdmin()) {
            $query->whereHas('booking.room', function ($q) use ($user) {
                $q->where('location_id', $user->location_id);
            });
        }

        // Filters
        if ($request->action) {
            $query->where('action', $request->action);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('ip_address', 'like', "%{$request->search}%")
                  ->orWhereHas('user', function ($uq) use ($request) {
                      $uq->where('name', 'like', "%{$request->search}%")
                         ->orWhere('email', 'like', "%{$request->search}%");
                  })
                  ->orWhereHas('booking', function ($bq) use ($request) {
                      $bq->where('title', 'like', "%{$request->search}%");
                  });
            });
        }

        $logs = $query->orderByDesc('created_at')->paginate(30);

        return response()->json($logs);
    }
}

