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
            'location_legend' => $this->location_legend,
            'image_url' => $this->image_url,
            'images' => $this->images,
            'is_active' => $this->is_active,
            'location_id' => $this->location_id,
            'location' => new LocationResource($this->whenLoaded('location')),
            // Dynamic attributes set by availability check
            'is_available' => $this->when(isset($this->is_available), $this->is_available),
        ];
    }
}
