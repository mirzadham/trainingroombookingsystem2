<?php

namespace App\Rules;

use App\Models\Room;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class WithinRoomCapacity implements ValidationRule
{
    /**
     * Validate that the number of attendees does not exceed the room's capacity.
     *
     * Resolves the room from the current request payload (room_id), falling
     * back to the route's booking if the request is an update without room_id.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $roomId = request()->input('room_id')
            ?? request()->route('booking')?->room_id;

        if (! $roomId) {
            return;
        }

        $room = Room::find($roomId);

        if ($room && (int) $value > (int) $room->capacity) {
            $fail("Number of attendees ({$value}) exceeds room capacity ({$room->capacity}).");
        }
    }
}
