<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Requests\Booking\StoreRecurringBookingRequest;
use App\Http\Requests\Booking\UpdateBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

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
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookingService->create($request->validated(), $request->user());

        return (new BookingResource($booking))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/bookings/{booking}
     * Show a specific booking.
     */
    public function show(Request $request, Booking $booking): JsonResponse
    {
        Gate::authorize('view', $booking);

        return (new BookingResource(
            $booking->load(['room.location', 'user', 'approver'])
        ))->response();
    }

    /**
     * PUT /api/bookings/{booking}
     * Update a pending booking.
     */
    public function update(UpdateBookingRequest $request, Booking $booking): JsonResponse
    {
        $booking = $this->bookingService->update($booking, $request->validated(), $request->user());

        return (new BookingResource($booking))->response();
    }

    /**
     * POST /api/bookings/{booking}/cancel
     * Cancel an approved booking.
     */
    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        Gate::authorize('cancel', $booking);

        $booking = $this->bookingService->cancel($booking, $request->user());

        return (new BookingResource($booking))->response();
    }

    /**
     * POST /api/bookings/recurring
     * Create a recurring weekly booking series.
     */
    public function storeRecurring(StoreRecurringBookingRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $bookings = $this->bookingService->createRecurringSeries(
            $validated,
            $request->user(),
            $validated['weeks']
        );

        return response()->json(
            BookingResource::collection($bookings),
            201
        );
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
