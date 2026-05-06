<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'user_type',
        'location_id',
        'phone',
        'department',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // Role constants
    const ROLE_USER = 'user';
    const ROLE_LOCATION_ADMIN = 'location_admin';
    const ROLE_SUPER_ADMIN = 'super_admin';

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_LOCATION_ADMIN, self::ROLE_SUPER_ADMIN]);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function isLocationAdmin(): bool
    {
        return $this->role === self::ROLE_LOCATION_ADMIN;
    }

    /**
     * Check if admin has access to a specific location
     */
    public function hasLocationAccess(int $locationId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->isLocationAdmin()) {
            return $this->location_id === $locationId;
        }

        return false;
    }
}
