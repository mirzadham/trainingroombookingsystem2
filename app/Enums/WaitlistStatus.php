<?php

namespace App\Enums;

enum WaitlistStatus: string
{
    case Active = 'active';
    case Notified = 'notified';
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Notified => 'Notified',
            self::Expired => 'Expired',
        };
    }
}
