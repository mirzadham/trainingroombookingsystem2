<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'capacity' => $this->capacity,
            'amenities' => $this->amenities,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'is_active' => $this->is_active,
            'location' => new LocationResource($this->whenLoaded('location')),
            // Dynamic attributes set by availability check
            'is_available' => $this->when(isset($this->is_available), $this->is_available),
        ];
    }
}
