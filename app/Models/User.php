<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'user_type',
        'location_id',
        'phone',
        'department',
        'status',
        'calendar_token',
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
            'role' => UserRole::class,
        ];
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function favoriteRooms(): BelongsToMany
    {
        return $this->belongsToMany(Room::class, 'favorites')->withTimestamps();
    }

    /**
     * Rooms this user administers (room-admin scope).
     */
    public function adminRooms(): BelongsToMany
    {
        return $this->belongsToMany(Room::class, 'admin_room_user')->withTimestamps();
    }

    public function waitlistEntries(): HasMany
    {
        return $this->hasMany(WaitlistEntry::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    public function isAdmin(): bool
    {
        return $this->role->isAdmin();
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    public function isLocationAdmin(): bool
    {
        return $this->role === UserRole::LocationAdmin;
    }

    public function isRoomAdmin(): bool
    {
        return $this->role === UserRole::RoomAdmin;
    }

    /**
     * Get (and lazily create) this user's calendar feed token.
     *
     * The token is the unguessable key for the public iCal subscription feed,
     * so it must never be exposed outside the owner's own session.
     */
    public function getOrCreateCalendarToken(): string
    {
        if ($this->calendar_token) {
            return $this->calendar_token;
        }

        $token = Str::random(64);

        // Extremely unlikely collision — retry rather than crash.
        while (static::where('calendar_token', $token)->exists()) {
            $token = Str::random(64);
        }

        $this->update(['calendar_token' => $token]);

        return $token;
    }

    public function regenerateCalendarToken(): string
    {
        $token = Str::random(64);

        while (static::where('calendar_token', $token)->exists()) {
            $token = Str::random(64);
        }

        $this->update(['calendar_token' => $token]);

        return $token;
    }

    /**
     * Check if admin has access to a specific location.
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

    /**
     * Check if admin has access to a specific room.
     *
     * Super admins access every room, location admins every room in their
     * campus, and room admins only their explicitly assigned rooms.
     */
    public function hasRoomAccess(Room $room): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->isLocationAdmin()) {
            return $this->location_id === $room->location_id;
        }

        if ($this->isRoomAdmin()) {
            return $this->adminRooms()->whereKey($room->id)->exists();
        }

        return false;
    }

    /**
     * Room IDs this admin is scoped to.
     *
     * null means room-level scoping does not apply (super admins and
     * location admins keep their location-based scoping); an empty array
     * means the room admin is scoped to zero rooms (callers must filter
     * accordingly — never treat [] as "no filter").
     */
    public function adminRoomIds(): ?array
    {
        if (! $this->isRoomAdmin()) {
            return null;
        }

        return $this->adminRooms()->pluck('rooms.id')->all();
    }
}
