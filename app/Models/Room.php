<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'location_id',
        'name',
        'capacity',
        'amenities',
        'description',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'amenities' => 'array',
        'is_active' => 'boolean',
        'capacity' => 'integer',
    ];

    protected $appends = [
        'images',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Scope: only active rooms
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: rooms that can fit the given number of attendees
     */
    public function scopeMinCapacity($query, int $attendees)
    {
        return $query->where('capacity', '>=', $attendees);
    }

    /**
     * Get all images associated with this room.
     * Scans the folder of the room's main image if it's in a subfolder.
     */
    public function getImagesAttribute(): array
    {
        if (!$this->image_url) {
            return [];
        }

        // Standard placeholders are directly in /images/rooms/
        // Real room-specific galleries are in subfolders like /images/rooms/khtp/{room}/
        $dirName = str_replace('\\', '/', dirname($this->image_url));
        
        // If the main image is directly in /images/rooms or not structured, return it alone
        if ($dirName === '/images/rooms' || $dirName === 'images/rooms' || $dirName === '/' || $dirName === '.') {
            return [$this->image_url];
        }

        // Cache the scanned directory result to avoid disk read overhead
        return Cache::remember("room_images_gallery:{$this->id}", 86400, function () use ($dirName) {
            $absoluteDir = public_path($dirName);

            if (is_dir($absoluteDir)) {
                $files = scandir($absoluteDir);
                $images = [];
                $validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

                foreach ($files as $file) {
                    if ($file === '.' || $file === '..') {
                        continue;
                    }

                    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    if (in_array($ext, $validExtensions)) {
                        $images[] = rtrim($dirName, '/') . '/' . $file;
                    }
                }

                if (!empty($images)) {
                    sort($images);
                    return $images;
                }
            }

            return [$this->image_url];
        });
    }
}
