<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user?->isAdmin()) {
            return false;
        }

        $room = $this->route('room');
        if ($user->isLocationAdmin() && $room && $room->location_id !== $user->location_id) {
            return false;
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:100',
            'capacity' => 'sometimes|integer|min:1',
            'amenities' => 'nullable|array',
            'description' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
