<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminUpdateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
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
