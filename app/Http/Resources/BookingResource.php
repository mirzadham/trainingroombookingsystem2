<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'start_time' => $this->start_time?->toIso8601String(),
            'end_time' => $this->end_time?->toIso8601String(),
            'attendees' => $this->attendees,
            'phone' => $this->phone,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'cancellation_reason' => $this->cancellation_reason,
            'recurrence_group_id' => $this->recurrence_group_id,
            'group_id' => $this->group_id,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'room' => new RoomResource($this->whenLoaded('room')),
            'user' => new UserResource($this->whenLoaded('user')),
            'approver' => new UserResource($this->whenLoaded('approver')),
            'canceller' => new UserResource($this->whenLoaded('canceller')),
        ];
    }
}
