<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminUpdateBookingRequest;
use App\Http\Requests\Admin\RejectBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Room;
use App\Models\RoomBlackout;
use App\Models\User;
use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Services\ApprovalService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

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
                  ->orWhere('reference_no', 'like', "%{$search}%")
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
                ->whereBetween('start_time', [
                    now()->startOfMonth()->toDateTimeString(),
                    now()->endOfMonth()->toDateTimeString()
                ])
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
                      $bq->where('title', 'like', "%{$request->search}%")
                        ->orWhere('reference_no', 'like', "%{$request->search}%");
                  });
            });
        }

        $logs = $query->orderByDesc('created_at')->paginate(30);

        return response()->json($logs);
    }

    /**
     * POST /api/admin/bookings
     * Create a booking as an admin (auto-approved, option to bypass validations).
     */
    public function storeBooking(
        Request $request, 
        \App\Services\BookingService $bookingService, 
        \App\Services\AvailabilityService $availabilityService,
        \App\Services\AuditService $auditService
    ): JsonResponse {
        $admin = $request->user();

        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'attendees' => 'required|integer|min:1',
            
            // Booker details
            'booker_type' => 'required|in:registered,guest',
            'user_id' => 'required_if:booker_type,registered|nullable|exists:users,id',
            'guest_name' => 'required_if:booker_type,guest|nullable|string|max:255',
            'guest_email' => 'required_if:booker_type,guest|nullable|email|max:255',
            'guest_phone' => 'nullable|string|max:20',
            
            // Bypass validations toggle
            'bypass_validation' => 'nullable|boolean',
        ]);

        $roomId = (int)$validated['room_id'];
        $room = Room::findOrFail($roomId);

        // 1. Authorize: check if admin has access to this room's location
        if (!$admin->hasLocationAccess($room->location_id)) {
            throw ValidationException::withMessages([
                'authorization' => 'You do not have access to bookings at this location.',
            ]);
        }

        // 2. Resolve/Create Booker
        $targetUser = null;
        if ($validated['booker_type'] === 'guest') {
            $email = $validated['guest_email'];
            $targetUser = User::where('email', $email)->first();

            if (!$targetUser) {
                // Auto-create standard external user account
                $targetUser = User::create([
                    'name' => $validated['guest_name'],
                    'email' => $email,
                    'phone' => $validated['guest_phone'] ?? null,
                    'password' => Hash::make(Str::random(16)),
                    'role' => UserRole::User,
                    'user_type' => 'external',
                    'status' => 'active',
                ]);
            } else {
                if (!empty($validated['guest_phone']) && empty($targetUser->phone)) {
                    $targetUser->update(['phone' => $validated['guest_phone']]);
                }
            }
        } else {
            $targetUser = User::findOrFail($validated['user_id']);
        }

        $phone = $validated['booker_type'] === 'guest' 
            ? ($validated['guest_phone'] ?? '') 
            : ($validated['guest_phone'] ?? $targetUser->phone ?? '');

        // 3. Determine if it is a multi-day booking
        $isMultiDay = !empty($validated['end_date']) && $validated['end_date'] !== $validated['start_date'];
        
        $bypass = !empty($validated['bypass_validation']);

        $createdBookings = collect();

        DB::transaction(function () use ($validated, $targetUser, $room, $isMultiDay, $bypass, $availabilityService, $auditService, $admin, $phone, &$createdBookings) {
            $startDate = Carbon::parse($validated['start_date']);
            $endDate   = $isMultiDay ? Carbon::parse($validated['end_date']) : $startDate;

            $startTimeRaw = Carbon::parse($validated['start_time']);
            $endTimeRaw   = Carbon::parse($validated['end_time']);

            // End time must be after start time
            if ($endTimeRaw->lte($startTimeRaw)) {
                throw ValidationException::withMessages([
                    'end_time' => 'End time must be after start time.',
                ]);
            }

            if ($isMultiDay) {
                // Validate multi-day duration rules (e.g. maximum days)
                $maxDays = (int) config('booking.max_duration_days', 14);
                $totalDays = $startDate->diffInDays($endDate) + 1;
                if ($totalDays > $maxDays) {
                    throw ValidationException::withMessages([
                        'end_date' => "Consecutive multi-day bookings cannot exceed {$maxDays} days.",
                    ]);
                }

                $timeStart = $startTimeRaw->format('H:i:s');
                $timeEnd   = $endTimeRaw->format('H:i:s');
                $groupId = Str::uuid()->toString();

                for ($current = $startDate->copy(); $current->lte($endDate); $current->addDay()) {
                    $dayStart = Carbon::createFromTimeString($timeStart, 'Asia/Kuala_Lumpur')
                        ->setDate($current->year, $current->month, $current->day);
                    $dayEnd   = Carbon::createFromTimeString($timeEnd, 'Asia/Kuala_Lumpur')
                        ->setDate($current->year, $current->month, $current->day);

                    // A. Check for double booking (Overlap) - ALWAYS enforced
                    if ($availabilityService->hasConflict($room->id, $dayStart, $dayEnd)) {
                        throw ValidationException::withMessages([
                            'time' => 'The selected room is unavailable on ' . $current->format('Y-m-d') . ' due to another approved booking or blackout.',
                        ]);
                    }

                    // B. Validate minor rules if bypass is false
                    if (!$bypass) {
                        $this->runStrictValidationRules($dayStart, $dayEnd, $room, $validated['attendees']);
                    }

                    // Store using local Asia/Kuala_Lumpur times directly
                    $booking = Booking::create([
                        'user_id' => $targetUser->id,
                        'room_id' => $room->id,
                        'title' => $validated['title'],
                        'description' => $validated['description'] ?? null,
                        'start_time' => $dayStart,
                        'end_time' => $dayEnd,
                        'attendees' => $validated['attendees'],
                        'phone' => $phone,
                        'status' => BookingStatus::Approved,
                        'approved_by' => $admin->id,
                        'approved_at' => Carbon::now(),
                        'group_id' => $groupId,
                    ]);

                    // Audit log
                    $auditService->log($admin, $booking, 'created', [
                        'group_id' => $groupId,
                        'booking_date' => $current->format('Y-m-d'),
                        'multi_day_booking' => true,
                        'admin_created' => true,
                    ]);

                    $createdBookings->push($booking);
                }
            } else {
                // Single-day booking
                $start = Carbon::createFromTimeString($startTimeRaw->format('H:i:s'), 'Asia/Kuala_Lumpur')
                    ->setDate($startDate->year, $startDate->month, $startDate->day);
                $end   = Carbon::createFromTimeString($endTimeRaw->format('H:i:s'), 'Asia/Kuala_Lumpur')
                    ->setDate($startDate->year, $startDate->month, $startDate->day);

                // A. Check for double booking (Overlap) - ALWAYS enforced
                if ($availabilityService->hasConflict($room->id, $start, $end)) {
                    throw ValidationException::withMessages([
                        'time' => 'The selected room is unavailable during this time slot.',
                    ]);
                }

                // B. Validate minor rules if bypass is false
                if (!$bypass) {
                    $this->runStrictValidationRules($start, $end, $room, $validated['attendees']);
                }

                // Store using local Asia/Kuala_Lumpur times directly
                $booking = Booking::create([
                    'user_id' => $targetUser->id,
                    'room_id' => $room->id,
                    'title' => $validated['title'],
                    'description' => $validated['description'] ?? null,
                    'start_time' => $start,
                    'end_time' => $end,
                    'attendees' => $validated['attendees'],
                    'phone' => $phone,
                    'status' => BookingStatus::Approved,
                    'approved_by' => $admin->id,
                    'approved_at' => Carbon::now(),
                ]);

                // Audit log
                $auditService->log($admin, $booking, 'created', [
                    'admin_created' => true,
                ]);

                $createdBookings->push($booking);
            }
        });

        // Send booking notification outside transaction to avoid lock holding
        if ($createdBookings->isNotEmpty()) {
            $notificationService = app(\App\Services\NotificationService::class);
            $notificationService->sendBookingNotification($createdBookings->first(), 'approved');
        }

        return response()->json([
            'message' => 'Booking created and approved successfully.',
            'bookings' => BookingResource::collection($createdBookings),
        ], 201);
    }

    /**
     * GET /api/admin/calendar
     * Fetch all bookings and blackouts for admin calendar view.
     */
    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location_id' => 'nullable|exists:locations,id',
            'room_id' => 'nullable|exists:rooms,id',
            'status' => 'nullable|string',
        ]);

        $user = $request->user();
        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate = Carbon::parse($request->end_date)->endOfDay();

        // 1. Query Bookings
        $bookingQuery = Booking::with(['room.location', 'user:id,name,email'])
            ->where('start_time', '>=', $startDate)
            ->where('end_time', '<=', $endDate);

        if ($user->isLocationAdmin()) {
            $bookingQuery->whereHas('room', fn($q) => $q->where('location_id', $user->location_id));
        }

        if ($request->location_id) {
            $bookingQuery->whereHas('room', fn($q) => $q->where('location_id', $request->location_id));
        }
        if ($request->room_id) {
            $bookingQuery->where('room_id', $request->room_id);
        }

        if ($request->status && $request->status !== 'all') {
            $statuses = explode(',', $request->status);
            $bookingQuery->whereIn('status', $statuses);
        } else {
            // Default: show pending, approved, and cancelled bookings
            $bookingQuery->whereIn('status', [BookingStatus::Pending, BookingStatus::Approved, BookingStatus::Cancelled]);
        }

        $bookings = $bookingQuery->orderBy('start_time')->get()->map(fn($b) => [
            'id' => $b->id,
            'title' => $b->title,
            'start' => $b->start_time->toIso8601String(),
            'end' => $b->end_time->toIso8601String(),
            'room' => $b->room->name,
            'room_id' => $b->room_id,
            'location' => $b->room->location->code,
            'location_id' => $b->room->location_id,
            'booked_by' => $b->user->name,
            'booked_by_email' => $b->user->email,
            'group_id' => $b->group_id,
            'status' => $b->status->value,
            'type' => 'booking',
            
            // Re-map other fields required by BookingDetailsModal
            'description' => $b->description,
            'attendees' => $b->attendees,
            'phone' => $b->phone,
            'rejection_reason' => $b->rejection_reason,
            'cancellation_reason' => $b->cancellation_reason,
            'user' => [
                'id' => $b->user->id,
                'name' => $b->user->name,
                'email' => $b->user->email,
            ],
            'room_relation' => [
                'id' => $b->room->id,
                'name' => $b->room->name,
                'location' => [
                    'id' => $b->room->location->id,
                    'code' => $b->room->location->code,
                    'name' => $b->room->location->name,
                    'address' => $b->room->location->address,
                ]
            ]
        ]);

        $events = collect($bookings);

        // 2. Query Blackouts (if blackout is requested or status is all/default)
        if (!$request->status || $request->status === 'all' || str_contains($request->status, 'blackout')) {
            $blackoutQuery = RoomBlackout::with(['room.location', 'creator:id,name,email'])
                ->where('start_time', '>=', $startDate)
                ->where('end_time', '<=', $endDate);

            if ($user->isLocationAdmin()) {
                $blackoutQuery->whereHas('room', fn($q) => $q->where('location_id', $user->location_id));
            }

            if ($request->location_id) {
                $blackoutQuery->whereHas('room', fn($q) => $q->where('location_id', $request->location_id));
            }
            if ($request->room_id) {
                $blackoutQuery->where('room_id', $request->room_id);
            }

            $blackouts = $blackoutQuery->orderBy('start_time')->get()->map(fn($bo) => [
                'id' => 'blackout-' . $bo->id,
                'blackout_id' => $bo->id,
                'title' => '[Blackout] ' . $bo->title,
                'start' => $bo->start_time->toIso8601String(),
                'end' => $bo->end_time->toIso8601String(),
                'room' => $bo->room->name,
                'room_id' => $bo->room_id,
                'location' => $bo->room->location->code,
                'location_id' => $bo->room->location_id,
                'booked_by' => $bo->creator->name,
                'booked_by_email' => $bo->creator->email,
                'status' => 'blackout',
                'type' => 'blackout',
                'description' => $bo->description,
            ]);

            $events = $events->concat($blackouts);
        }

        return response()->json($events);
    }

    /**
     * Helper to run strict booking validation rules (operating hours, capacity, duration).
     */
    private function runStrictValidationRules(Carbon $start, Carbon $end, Room $room, int $attendees): void
    {
        $now = Carbon::now('Asia/Kuala_Lumpur');

        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');
        $minDuration = config('booking.min_duration_minutes');
        $maxDuration = config('booking.max_duration_minutes');
        $advanceMinutes = config('booking.same_day_advance_minutes');

        // Operating hours
        $closeDisplay = $closeHour - 12;
        if ($start->hour < $openHour || $end->hour > $closeHour) {
            throw ValidationException::withMessages([
                'time' => "Bookings must be within operating hours ({$openHour}:00 AM – {$closeDisplay}:00 PM).",
            ]);
        }
        if ($end->hour === $closeHour && $end->minute > 0) {
            throw ValidationException::withMessages([
                'time' => "Bookings must end by {$closeDisplay}:00 PM.",
            ]);
        }

        // Min duration
        $durationMinutes = $start->diffInMinutes($end);
        if ($durationMinutes < $minDuration) {
            throw ValidationException::withMessages([
                'duration' => "Minimum booking duration is {$minDuration} minutes.",
            ]);
        }

        // Max duration
        if ($durationMinutes > $maxDuration) {
            $maxHours = $maxDuration / 60;
            $displayHours = floor($maxHours) === $maxHours ? (int)$maxHours : round($maxHours, 1);
            throw ValidationException::withMessages([
                'duration' => "Maximum booking duration is {$displayHours} hours.",
            ]);
        }

        // Same-day booking must be at least N minutes before start
        if ($advanceMinutes > 0 && $start->isSameDay($now) && $start->diffInMinutes($now, false) > -$advanceMinutes) {
            throw ValidationException::withMessages([
                'start_time' => "Same-day bookings must be made at least {$advanceMinutes} minutes before the start time.",
            ]);
        }

        // Cannot book in the past
        if ($start->isPast()) {
            throw ValidationException::withMessages([
                'start_time' => 'Cannot book a time slot in the past.',
            ]);
        }

        // Attendees capacity limit
        if ($attendees > $room->capacity) {
            throw ValidationException::withMessages([
                'attendees' => "Number of attendees ({$attendees}) exceeds room capacity ({$room->capacity}).",
            ]);
        }
    }
}

