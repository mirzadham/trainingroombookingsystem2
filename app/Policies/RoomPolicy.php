<?php

namespace App\Policies;

use App\Models\Room;
use App\Models\User;

class RoomPolicy
{
    /**
     * Can this user view admin room list?
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Can this user create a room?
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Can this user update this room?
     */
    public function update(User $user, Room $room): bool
    {
        if (!$user->isAdmin()) {
            return false;
        }

        if ($user->isLocationAdmin()) {
            return $room->location_id === $user->location_id;
        }

        return true; // Super admin can update any room
    }

    /**
     * Can this user delete (deactivate) this room?
     */
    public function delete(User $user, Room $room): bool
    {
        return $this->update($user, $room); // Same access rules
    }

    /**
     * Can this user view this room details in admin panel?
     */
    public function view(User $user, Room $room): bool
    {
        if (!$user->isAdmin()) {
            return false;
        }

        if ($user->isLocationAdmin()) {
            return $room->location_id === $user->location_id;
        }

        return true;
    }
}
