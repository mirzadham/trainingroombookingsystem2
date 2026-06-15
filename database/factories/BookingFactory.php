<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use App\Enums\BookingStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        // Default start time set in the future during operating hours (e.g. 10:00 AM)
        $startTime = now()->addDays(2)->setTime(10, 0, 0);
        $endTime = $startTime->copy()->addHours(2);

        return [
            'user_id' => User::factory(),
            'room_id' => Room::factory(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'attendees' => 10,
            'phone' => '+60123456789',
            'status' => BookingStatus::Pending,
        ];
    }
}
