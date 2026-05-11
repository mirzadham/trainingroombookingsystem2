<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $booking = $this->route('booking');
        return $this->user() && $booking && $booking->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'room_id' => 'sometimes|exists:rooms,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'attendees' => 'sometimes|integer|min:1',
            'phone' => 'sometimes|required|string|max:20',
        ];
    }
}
