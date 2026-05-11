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
        if ($request->date) {
            $query->whereDate('start_time', $request->date);
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
}
