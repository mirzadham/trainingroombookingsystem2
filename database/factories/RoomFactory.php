<?php

namespace Database\Factories;

use App\Models\Room;
use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoomFactory extends Factory
{
    protected $model = Room::class;

    public function definition(): array
    {
        return [
            'location_id' => Location::factory(),
            'name' => 'Training Room ' . $this->faker->unique()->numberBetween(100, 999),
            'capacity' => $this->faker->numberBetween(10, 100),
            'amenities' => ['Projector', 'Whiteboard', 'Wifi'],
            'description' => $this->faker->sentence(),
            'is_active' => true,
            'image_url' => '/images/rooms/default.png',
        ];
    }
}
