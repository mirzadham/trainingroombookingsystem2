<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location_id' => 'nullable|exists:locations,id',
            'room_id' => 'nullable|exists:rooms,id',
        ]);

        $query = Booking::approved()
            ->with(['room.location', 'user:id,name'])
            ->where('start_time', '>=', $request->start_date)
            ->where('end_time', '<=', Carbon::parse($request->end_date)->endOfDay());

        if ($request->location_id) {
            $query->whereHas('room', fn($q) => $q->where('location_id', $request->location_id));
        }
        if ($request->room_id) {
            $query->where('room_id', $request->room_id);
        }

        $events = $query->orderBy('start_time')->get()->map(fn($b) => [
            'id' => $b->id,
            'title' => $b->title,
            'start' => $b->start_time->toIso8601String(),
            'end' => $b->end_time->toIso8601String(),
            'room' => $b->room->name,
            'room_id' => $b->room_id,
            'location' => $b->room->location->code,
            'booked_by' => $b->user->name,
            'group_id' => $b->group_id,
        ]);

        return response()->json($events);
    }
}
