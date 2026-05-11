<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user?->isAdmin()) {
            return false;
        }

        // Location admins can only add rooms to their location
        if ($user->isLocationAdmin() && $this->input('location_id') != $user->location_id) {
            return false;
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'location_id' => 'required|exists:locations,id',
            'name' => 'required|string|max:100',
            'capacity' => 'required|integer|min:1',
            'amenities' => 'nullable|array',
            'description' => 'nullable|string|max:500',
        ];
    }
}
