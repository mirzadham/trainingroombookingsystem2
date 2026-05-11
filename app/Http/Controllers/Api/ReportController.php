<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function utilization(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location_id' => 'nullable|exists:locations,id',
        ]);

        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $start = Carbon::parse($request->start_date);
        $end = Carbon::parse($request->end_date);
        $totalDays = $start->diffInDays($end) + 1;

        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');
        $hoursPerDay = $closeHour - $openHour;
        $totalAvailableHours = $totalDays * $hoursPerDay;

        $query = Room::active()->with('location');
        if ($request->location_id) {
            $query->where('location_id', $request->location_id);
        }
        if ($user->isLocationAdmin()) {
            $query->where('location_id', $user->location_id);
        }

        $rooms = $query->get();
        $utilization = [];

        foreach ($rooms as $room) {
            $bookedHours = Booking::approved()
                ->where('room_id', $room->id)
                ->where('start_time', '>=', $start)
                ->where('end_time', '<=', $end->copy()->endOfDay())
                ->get()
                ->sum(fn($b) => $b->start_time->diffInMinutes($b->end_time) / 60);

            $utilization[] = [
                'room' => $room->name,
                'location' => $room->location->code,
                'booked_hours' => round($bookedHours, 1),
                'available_hours' => $totalAvailableHours,
                'utilization_pct' => $totalAvailableHours > 0
                    ? round(($bookedHours / $totalAvailableHours) * 100, 1) : 0,
            ];
        }

        return response()->json([
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'rooms' => $utilization,
        ]);
    }

    public function peakHours(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location_id' => 'nullable|exists:locations,id',
        ]);

        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $openHour = config('booking.operating_hours.open');
        $closeHour = config('booking.operating_hours.close');

        $query = Booking::approved()
            ->where('start_time', '>=', $request->start_date)
            ->where('end_time', '<=', Carbon::parse($request->end_date)->endOfDay());

        if ($request->location_id || $user->isLocationAdmin()) {
            $locId = $request->location_id ?? $user->location_id;
            $query->whereHas('room', fn($q) => $q->where('location_id', $locId));
        }

        $bookings = $query->get();
        $hourCounts = array_fill($openHour, $closeHour - $openHour, 0);

        foreach ($bookings as $booking) {
            $startHour = $booking->start_time->hour;
            $endHour = $booking->end_time->hour;
            for ($h = $startHour; $h < $endHour; $h++) {
                if (isset($hourCounts[$h])) {
                    $hourCounts[$h]++;
                }
            }
        }

        $peakData = [];
        foreach ($hourCounts as $hour => $count) {
            $peakData[] = [
                'hour' => sprintf('%d:00', $hour),
                'label' => Carbon::createFromTime($hour)->format('g A'),
                'booking_count' => $count,
            ];
        }

        return response()->json($peakData);
    }
}
