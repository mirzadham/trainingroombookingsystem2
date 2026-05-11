<?php

namespace App\Policies;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    /**
     * Can the user view their own bookings list?
     */
    public function viewAny(User $user): bool
    {
        return true; // Any authenticated user can see their own bookings
    }

    /**
     * Can the user view this specific booking?
     */
    public function view(User $user, Booking $booking): bool
    {
        // Owner can always view
        if ($booking->user_id === $user->id) {
            return true;
        }

        // Admins with location access can view
        if ($user->isAdmin()) {
            $booking->loadMissing('room');
            return $user->hasLocationAccess($booking->room->location_id);
        }

        return false;
    }

    /**
     * Can the user create a booking?
     */
    public function create(User $user): bool
    {
        return true; // Any authenticated user can create bookings
    }

    /**
     * Can the user update this booking?
     */
    public function update(User $user, Booking $booking): bool
    {
        // Only owner can update, and only if pending
        return $booking->user_id === $user->id
            && $booking->status === BookingStatus::Pending;
    }

    /**
     * Can the user cancel this booking?
     */
    public function cancel(User $user, Booking $booking): bool
    {
        // Owner can cancel
        if ($booking->user_id === $user->id) {
            return true;
        }

        // Admin with location access can cancel
        if ($user->isAdmin()) {
            $booking->loadMissing('room');
            return $user->hasLocationAccess($booking->room->location_id);
        }

        return false;
    }

    /**
     * Can the admin approve this booking?
     */
    public function approve(User $user, Booking $booking): bool
    {
        if (!$user->isAdmin()) {
            return false;
        }

        $booking->loadMissing('room');
        return $user->hasLocationAccess($booking->room->location_id);
    }

    /**
     * Can the admin reject this booking?
     */
    public function reject(User $user, Booking $booking): bool
    {
        return $this->approve($user, $booking); // Same access rules
    }

    /**
     * Can the admin update this booking (admin edit)?
     */
    public function adminUpdate(User $user, Booking $booking): bool
    {
        return $this->approve($user, $booking); // Same access rules
    }

    /**
     * Can this admin view all bookings (admin panel)?
     */
    public function viewAll(User $user): bool
    {
        return $user->isAdmin();
    }
}
