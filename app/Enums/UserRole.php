<?php

namespace App\Enums;

enum UserRole: string
{
    case User = 'user';
    case LocationAdmin = 'location_admin';
    case SuperAdmin = 'super_admin';

    /**
     * Check if this role has admin privileges.
     */
    public function isAdmin(): bool
    {
        return in_array($this, [self::LocationAdmin, self::SuperAdmin]);
    }
}
