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
                'name' => 'Seminar Room 1',
                'capacity' => 80,
                'amenities' => ['projector', 'whiteboard', 'video_conferencing', 'sound_system'],
                'description' => 'Premium large seminar room equipped with high-definition projection, state-of-the-art sound systems, and video conferencing capabilities. Perfect for large-scale training, workshops, and corporate seminars.',
                'image_url' => '/images/rooms/seminar-room-a.png',
            ],
            [
                'name' => 'Seminar Room 2',
                'capacity' => 60,
                'amenities' => ['projector', 'whiteboard', 'video_conferencing', 'sound_system'],
                'description' => 'Mid-sized modern seminar room with flexible seating configurations, dual display inputs, and professional acoustics. Optimized for interactive workshops and collaborative learning.',
                'image_url' => '/images/rooms/training-hall.png',
            ],
            [
                'name' => 'BDA Lab (Aluminium)',
                'capacity' => 40,
                'amenities' => ['projector', 'whiteboard', 'computers', 'air_conditioning'],
                'description' => 'Dedicated Big Data Analytics lab featuring high-performance computer workstations, high-speed networking, and collaborative software tooling. Designed for intensive tech training.',
                'image_url' => '/images/rooms/training-lab-1.png',
            ],
            [
                'name' => 'Argon Room',
                'capacity' => 15,
                'amenities' => ['projector', 'whiteboard', 'video_conferencing', 'smart_tv'],
                'description' => 'A high-end medium meeting and training room styled with modern executive furniture, high-speed Wi-Fi, and smart presentation displays.',
                'image_url' => '/images/rooms/boardroom.png',
            ],
            [
                'name' => 'Magnesium Room',
                'capacity' => 12,
                'amenities' => ['projector', 'whiteboard', 'video_conferencing'],
                'description' => 'Sleek, modern meeting space equipped with an interactive whiteboard, seamless wireless sharing, and comfortable ergonomic seating.',
                'image_url' => '/images/rooms/meeting-room-b1.png',
            ],
            [
                'name' => 'Training Room 1 (Samarium)',
                'capacity' => 30,
                'amenities' => ['projector', 'whiteboard', 'smart_tv'],
                'description' => 'Fully air-conditioned professional training room featuring modular writing tables, magnetic glass boards, and high-brightness projection equipment.',
                'image_url' => '/images/rooms/collaboration-space.png',
            ],
            [
                'name' => 'Training Room 2 (Europium)',
                'capacity' => 25,
                'amenities' => ['projector', 'whiteboard', 'smart_tv'],
                'description' => 'Modern, high-comfort classroom-style room designed for optimal visibility, acoustics, and group learning activities. Equipped with modern presentation tools.',
                'image_url' => '/images/rooms/innovation-lab.png',
            ],
        ];

        // KHTP Rooms
        $khtpRooms = [
            [
                'name' => 'Training Room 1',
                'capacity' => 35,
                'amenities' => ['projector', 'whiteboard', 'smart_tv'],
                'description' => 'Kulim Tech Park modern classroom-style room designed for high-comfort long training sessions. Features advanced temperature control and smart screens.',
                'image_url' => '/images/rooms/collaboration-space.png',
            ],
            [
                'name' => 'Training Room 2',
                'capacity' => 30,
                'amenities' => ['projector', 'whiteboard', 'smart_tv'],
                'description' => 'Professional training room in Kulim with highly flexible modular tables, perfect for team brainstorming and small-to-mid-size classroom training.',
                'image_url' => '/images/rooms/innovation-lab.png',
            ],
            [
                'name' => 'Town Hall',
                'capacity' => 120,
                'amenities' => ['projector', 'sound_system', 'video_conferencing', 'microphones'],
                'description' => 'Expansive open-concept town hall layout for massive corporate presentations, panel discussions, and keynotes. Outfitted with dual giant screens and premium sound system.',
                'image_url' => '/images/rooms/training-hall.png',
            ],
            [
                'name' => 'K World',
                'capacity' => 50,
                'amenities' => ['projector', 'whiteboard', 'computers', 'video_conferencing'],
                'description' => 'Cutting-edge digital exploration space featuring advanced tech computers, VR capabilities, and immersive media systems for next-generation training.',
                'image_url' => '/images/rooms/training-lab-1.png',
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
