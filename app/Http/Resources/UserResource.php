<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'user_type' => $this->user_type,
            'phone' => $this->phone,
            'department' => $this->department,
            'location_id' => $this->location_id,
            'location' => new LocationResource($this->whenLoaded('location')),
            'admin_rooms' => RoomResource::collection($this->whenLoaded('adminRooms')),
        ];
    }
}
