<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    public function __construct(
        private AvailabilityService $availabilityService
    ) {}

    /**
     * GET /api/availability/search
     * Search for available rooms matching criteria.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'location_id' => 'nullable|exists:locations,id',
            'date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'attendees' => 'nullable|integer|min:1',
        ]);

        $date = Carbon::parse($request->date);
        $startTime = Carbon::createFromFormat('H:i', $request->start_time);
        $endTime = Carbon::createFromFormat('H:i', $request->end_time);

        $rooms = $this->availabilityService->getAvailableRooms(
            $request->location_id,
            $date,
            $startTime,
            $endTime,
            $request->attendees
        );

        // If no available rooms, get fallback suggestions
        $availableRooms = $rooms->where('is_available', true);
        $suggestions = [];

        if ($availableRooms->isEmpty()) {
            $suggestions = $this->availabilityService->getFallbackSuggestions(
                $request->location_id,
                $date,
                $startTime,
                $endTime,
                $request->attendees
            );
        }

        return response()->json([
            'rooms' => $rooms->values(),
            'suggestions' => $suggestions,
            'meta' => [
                'date' => $date->toDateString(),
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'total_rooms' => $rooms->count(),
                'available_rooms' => $availableRooms->count(),
            ],
        ]);
    }

    /**
     * GET /api/availability/timeline
     * Get timeline grid data for a location on a specific date.
     */
    public function timeline(Request $request): JsonResponse
    {
        $request->validate([
            'location_id' => 'nullable|exists:locations,id',
            'date' => 'required|date',
        ]);

        $date = Carbon::parse($request->date);

        $grid = $this->availabilityService->getTimelineGrid(
            $request->location_id,
            $date
        );

        return response()->json($grid);
    }

    /**
     * GET /api/availability/suggestions
     * Get fallback suggestions for a search.
     */
    public function suggestions(Request $request): JsonResponse
    {
        $request->validate([
            'location_id' => 'nullable|exists:locations,id',
            'date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'attendees' => 'nullable|integer|min:1',
        ]);

        $date = Carbon::parse($request->date);
        $startTime = Carbon::createFromFormat('H:i', $request->start_time);
        $endTime = Carbon::createFromFormat('H:i', $request->end_time);

        $suggestions = $this->availabilityService->getFallbackSuggestions(
            $request->location_id,
            $date,
            $startTime,
            $endTime,
            $request->attendees
        );

        return response()->json($suggestions);
    }

    /**
     * GET /api/rooms/available
     * Get rooms with full-day timeline data for the Visual Grid view.
     * Does NOT require start/end time — returns all rooms matching criteria
     * with their complete daily schedule.
     */
    public function roomsWithTimeline(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:date',
            'location_id' => 'nullable|exists:locations,id',
            'attendees' => 'nullable|integer|min:1',
        ]);

        $date = Carbon::parse($request->date);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : null;

        // Get the full timeline grid (rooms + slots)
        // Note: getTimelineGrid now includes image_url and description in room data
        $grid = $this->availabilityService->getTimelineGrid(
            $request->location_id,
            $date,
            $endDate
        );

        // Filter by capacity if attendees specified
        $rooms = collect($grid['grid']);
        if ($request->attendees) {
            $rooms = $rooms->filter(fn($row) => $row['room']['capacity'] >= (int)$request->attendees);
        }

        // Enrich room data with availability counts (no extra queries needed)
        $enrichedRooms = $rooms->map(function ($row) {
            $availableCount = collect($row['slots'])->where('status', 'available')->count();
            $totalSlots = count($row['slots']);

            return [
                'room' => array_merge($row['room'], [
                    'available_slots' => $availableCount,
                    'total_slots' => $totalSlots,
                ]),
                'slots' => $row['slots'],
            ];
        })->values();

        return response()->json([
            'date' => $grid['date'],
            'end_date' => $grid['end_date'] ?? null,
            'time_slots' => $grid['time_slots'],
            'rooms' => $enrichedRooms,
            'meta' => [
                'total_rooms' => $enrichedRooms->count(),
                'fully_available' => $enrichedRooms->filter(fn($r) => $r['room']['available_slots'] === $r['room']['total_slots'])->count(),
            ],
        ]);
    }
}
