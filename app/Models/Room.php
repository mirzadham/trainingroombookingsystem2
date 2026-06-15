<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'location_id',
        'name',
        'capacity',
        'amenities',
        'description',
        'location_legend',
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
     */
    public function getImagesAttribute(): array
    {
        if (!$this->image_url) {
            return [];
        }

        // If it's a default static placeholder asset (does not contain a room-specific upload folder like '/rooms/{id}/'), return it alone
        if (!preg_match('/\/rooms\/\d+\//', $this->image_url)) {
            return [$this->image_url];
        }

        // Cache the scanned directory result to avoid disk read overhead
        return Cache::remember("room_images_gallery:{$this->id}", 86400, function () {
            $diskName = config('filesystems.default');
            $disk = Storage::disk($diskName);
            $directory = "rooms/{$this->id}";

            if ($disk->exists($directory)) {
                $files = $disk->files($directory);
                
                $images = array_map(function ($file) use ($disk) {
                    return $disk->url($file);
                }, $files);

                if (!empty($images)) {
                    sort($images);
                    return $images;
                }
            }

            return [$this->image_url];
        });
    }
}
