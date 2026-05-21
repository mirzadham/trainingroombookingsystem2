<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'room_id',
        'title',
        'description',
        'start_time',
        'end_time',
        'attendees',
        'phone',
        'status',
        'rejection_reason',
        'cancellation_reason',
        'cancelled_by',
        'recurrence_group_id',
        'group_id',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'approved_at' => 'datetime',
        'attendees' => 'integer',
        'status' => BookingStatus::class,
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    /**
     * Check if a status transition is allowed per the state machine.
     */
    public function canTransitionTo(BookingStatus $newStatus): bool
    {
        return $this->status->canTransitionTo($newStatus);
    }

    /**
     * Scope: only approved bookings (source of truth for availability).
     */
    public function scopeApproved($query)
    {
        return $query->where('status', BookingStatus::Approved);
    }

    /**
     * Scope: pending bookings.
     */
    public function scopePending($query)
    {
        return $query->where('status', BookingStatus::Pending);
    }

    /**
     * Scope: bookings that overlap with a given time range.
     * Overlap condition: (start < existing_end) AND (end > existing_start)
     */
    public function scopeOverlapping($query, $startTime, $endTime)
    {
        return $query->where('start_time', '<', $endTime)
                     ->where('end_time', '>', $startTime);
    }

    /**
     * Scope: bookings for a specific room.
     */
    public function scopeForRoom($query, int $roomId)
    {
        return $query->where('room_id', $roomId);
    }

    /**
     * Check if this booking is part of a recurring series.
     */
    public function isRecurring(): bool
    {
        return !is_null($this->recurrence_group_id);
    }
}
