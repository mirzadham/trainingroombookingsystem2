<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Location extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'address',
        'image_url',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function activeRooms(): HasMany
    {
        return $this->hasMany(Room::class)->where('is_active', true);
    }

    public function admins(): HasMany
    {
        return $this->hasMany(User::class)->where('role', 'location_admin');
    }
}
