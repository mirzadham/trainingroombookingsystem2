<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $tpm = Location::where('code', 'TPM')->first();
        $khtp = Location::where('code', 'KHTP')->first();

        // TPM Rooms
        $tpmRooms = [
            [
                'name' => 'Seminar Room A',
                'capacity' => 50,
                'amenities' => ['projector', 'whiteboard', 'video_conferencing', 'sound_system'],
                'description' => 'Large seminar room with full AV setup, ideal for workshops and presentations.',
                'image_url' => '/images/rooms/seminar-room-a.png',
            ],
            [
                'name' => 'Training Lab 1',
                'capacity' => 30,
                'amenities' => ['projector', 'whiteboard', 'computers', 'air_conditioning'],
                'description' => 'Computer lab with 30 workstations for hands-on technical training.',
                'image_url' => '/images/rooms/training-lab-1.png',
            ],
            [
                'name' => 'Meeting Room B1',
                'capacity' => 12,
                'amenities' => ['projector', 'whiteboard', 'video_conferencing'],
                'description' => 'Mid-size meeting room for team discussions and small workshops.',
                'image_url' => '/images/rooms/meeting-room-b1.png',
            ],
            [
                'name' => 'Boardroom',
                'capacity' => 20,
                'amenities' => ['projector', 'video_conferencing', 'sound_system', 'smart_tv'],
                'description' => 'Executive boardroom with premium furnishing and AV equipment.',
                'image_url' => '/images/rooms/boardroom.png',
            ],
        ];

        // KHTP Rooms
        $khtpRooms = [
            [
                'name' => 'Innovation Lab',
                'capacity' => 40,
                'amenities' => ['projector', 'whiteboard', 'computers', 'video_conferencing'],
                'description' => 'Multi-purpose innovation lab for training and prototyping sessions.',
                'image_url' => '/images/rooms/innovation-lab.png',
            ],
            [
                'name' => 'Collaboration Space',
                'capacity' => 25,
                'amenities' => ['projector', 'whiteboard', 'smart_tv'],
                'description' => 'Open collaboration space with flexible seating arrangements.',
                'image_url' => '/images/rooms/collaboration-space.png',
            ],
            [
                'name' => 'Meeting Room K1',
                'capacity' => 10,
                'amenities' => ['projector', 'whiteboard'],
                'description' => 'Compact meeting room for focused team discussions.',
                'image_url' => '/images/rooms/meeting-room-k1.png',
            ],
            [
                'name' => 'Training Hall',
                'capacity' => 60,
                'amenities' => ['projector', 'sound_system', 'video_conferencing', 'microphones'],
                'description' => 'Large training hall for company-wide events and certification programs.',
                'image_url' => '/images/rooms/training-hall.png',
            ],
        ];

        foreach ($tpmRooms as $room) {
            Room::create(array_merge($room, ['location_id' => $tpm->id]));
        }

        foreach ($khtpRooms as $room) {
            Room::create(array_merge($room, ['location_id' => $khtp->id]));
        }
    }
}
