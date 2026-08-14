<?php

namespace App\Http\Controllers\Api;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\RoomBlackout;
use App\Models\User;
use App\Services\AvailabilityCacheService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AdminCalendarController extends Controller
{
    /**
     * GET /api/admin/calendar
     * Fetch all bookings and blackouts for admin calendar view.
     */
    public function index(Request $request): JsonResponse
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
        $roomIds = $user->isRoomAdmin() ? $user->adminRoomIds()->all() : null;

        $events = app(AvailabilityCacheService::class)->remember(
            'admin-calendar:'.$user->id.':'.$request->start_date.':'.$request->end_date
                .':'.($request->location_id ?? 'all').':'.($request->room_id ?? 'all')
                .':'.($request->status ?? 'default')
                .($roomIds ? ':'.implode(',', $roomIds) : ''),
            3600,
            // Cache a plain array, never an Eloquent Collection: the cache
            // store refuses to unserialize PHP classes
            // (serializable_classes => false), so object payloads come back
            // as __PHP_Incomplete_Class and break the JSON response shape.
            fn () => $this->buildAdminCalendarEvents($request, $user, $startDate, $endDate, $roomIds)->all()
        );

        return response()->json($events);
    }

    /**
     * Build the admin calendar event list: bookings (shaped for the UI) plus
     * blackouts expanded into concrete occurrences within the range.
     */
    private function buildAdminCalendarEvents(Request $request, User $user, Carbon $startDate, Carbon $endDate, ?array $roomIds): Collection
    {
        // 1. Query Bookings
        $bookingQuery = Booking::with(['room.location', 'user:id,name,email'])
            ->where('start_time', '>=', $startDate)
            ->where('end_time', '<=', $endDate);

        if ($user->isLocationAdmin()) {
            $bookingQuery->whereHas('room', fn ($q) => $q->where('location_id', $user->location_id));
        }

        if ($roomIds !== null) {
            $bookingQuery->whereIn('room_id', $roomIds);
        }

        if ($request->location_id) {
            $bookingQuery->whereHas('room', fn ($q) => $q->where('location_id', $request->location_id));
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

        $events = $bookingQuery->orderBy('start_time')->get()
            ->map(fn (Booking $b) => $this->bookingEventShape($b));

        // 2. Query Blackouts (if blackout is requested or status is all/default)
        if (! $request->status || $request->status === 'all' || str_contains($request->status, 'blackout')) {
            $blackoutQuery = RoomBlackout::with(['room.location', 'creator:id,name,email'])
                ->overlapping($startDate, $endDate);

            if ($user->isLocationAdmin()) {
                $blackoutQuery->whereHas('room', fn ($q) => $q->where('location_id', $user->location_id));
            }

            if ($roomIds !== null) {
                $blackoutQuery->whereIn('room_id', $roomIds);
            }

            if ($request->location_id) {
                $blackoutQuery->whereHas('room', fn ($q) => $q->where('location_id', $request->location_id));
            }
            if ($request->room_id) {
                $blackoutQuery->where('room_id', $request->room_id);
            }

            $blackoutEvents = collect();

            foreach ($blackoutQuery->orderBy('start_time')->get() as $bo) {
                // Expand recurring blackouts into concrete occurrences within the range
                $instances = $bo->instancesBetween($startDate, $endDate);

                foreach ($instances as $index => $instance) {
                    $blackoutEvents->push([
                        'id' => 'blackout-'.$bo->id.'-'.$index,
                        'blackout_id' => $bo->id,
                        'title' => '[Blackout] '.$bo->title,
                        'start' => $instance['start']->toIso8601String(),
                        'end' => $instance['end']->toIso8601String(),
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
                }
            }

            $events = $events->concat($blackoutEvents);
        }

        return $events;
    }

    /**
     * GET /api/admin/calendar/series?group_id={group}
     * Fetch every occurrence of a consecutive multi-day booking group,
     * regardless of the visible calendar window, so the booking details
     * modal can show the complete series (not just in-view days).
     */
    public function series(Request $request): JsonResponse
    {
        $request->validate([
            'group_id' => 'required|string',
        ]);

        $user = $request->user();

        $query = Booking::with(['room.location', 'user:id,name,email'])
            ->where('group_id', $request->group_id)
            ->orderBy('start_time');

        if ($user->isLocationAdmin()) {
            $query->whereHas('room', fn ($q) => $q->where('location_id', $user->location_id));
        }

        if ($user->isRoomAdmin()) {
            $query->whereIn('room_id', $user->adminRoomIds()->all());
        }

        return response()->json($query->get()->map(fn (Booking $b) => $this->bookingEventShape($b)));
    }

    /**
     * Shape a booking as a calendar event, including the fields the
     * BookingDetailsModal reads (start_time/end_time aliases, reference_no,
     * nested room_relation object).
     */
    private function bookingEventShape(Booking $b): array
    {
        return [
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
            'recurrence_group_id' => $b->recurrence_group_id,
            'status' => $b->status->value,
            'type' => 'booking',

            // Re-map other fields required by BookingDetailsModal
            'reference_no' => $b->reference_no,
            'start_time' => $b->start_time->toIso8601String(),
            'end_time' => $b->end_time->toIso8601String(),
            'description' => $b->description,
            'attendees' => $b->attendees,
            'phone' => $b->phone,
            'rejection_reason' => $b->rejection_reason,
            'cancellation_reason' => $b->cancellation_reason,
            'attendance_status' => $b->attendance_status,
            'attendance_marked_at' => $b->attendance_marked_at?->toIso8601String(),
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
                ],
            ],
        ];
    }
}
