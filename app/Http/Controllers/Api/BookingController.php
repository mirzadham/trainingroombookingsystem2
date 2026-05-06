<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function __construct(
        private BookingService $bookingService
    ) {}

    /**
     * GET /api/bookings
     * List the authenticated user's bookings.
     */
    public function index(Request $request): JsonResponse
    {
        $bookings = Booking::where('user_id', $request->user()->id)
            ->with(['room.location', 'approver'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($bookings);
    }

    /**
     * POST /api/bookings
     * Create a new booking.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'attendees' => 'required|integer|min:1',
        ]);

        $booking = $this->bookingService->create($validated, $request->user());

        return response()->json($booking, 201);
    }

    /**
     * GET /api/bookings/{booking}
     * Show a specific booking.
     */
    public function show(Request $request, Booking $booking): JsonResponse
    {
        // Users can only view their own bookings
        if ($booking->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(
            $booking->load(['room.location', 'user', 'approver'])
        );
    }

    /**
     * PUT /api/bookings/{booking}
     * Update a pending booking.
     */
    public function update(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'room_id' => 'sometimes|exists:rooms,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'attendees' => 'sometimes|integer|min:1',
        ]);

        $booking = $this->bookingService->update($booking, $validated, $request->user());

        return response()->json($booking);
    }

    /**
     * POST /api/bookings/{booking}/cancel
     * Cancel an approved booking.
     */
    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $booking = $this->bookingService->cancel($booking, $request->user());

        return response()->json($booking);
    }

    /**
     * POST /api/bookings/recurring
     * Create a recurring weekly booking series.
     */
    public function storeRecurring(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'attendees' => 'required|integer|min:1',
            'weeks' => 'required|integer|min:2|max:52',
        ]);

        $bookings = $this->bookingService->createRecurringSeries(
            $validated,
            $request->user(),
            $validated['weeks']
        );

        return response()->json($bookings, 201);
    }

    /**
     * DELETE /api/bookings/{booking}
     * Not allowed — use cancel endpoint instead.
     */
    public function destroy(Booking $booking): JsonResponse
    {
        return response()->json([
            'message' => 'Bookings cannot be deleted. Use the cancel endpoint instead.',
        ], 405);
    }
}
