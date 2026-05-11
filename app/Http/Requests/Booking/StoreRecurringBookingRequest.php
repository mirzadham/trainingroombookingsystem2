<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecurringBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $maxWeeks = config('booking.max_recurring_weeks', 52);

        return [
            'room_id' => 'required|exists:rooms,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'attendees' => 'required|integer|min:1',
            'phone' => 'required|string|max:20',
            'weeks' => "required|integer|min:2|max:{$maxWeeks}",
        ];
    }
}
