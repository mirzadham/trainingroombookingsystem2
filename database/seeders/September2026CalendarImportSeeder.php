<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class September2026CalendarImportSeeder extends Seeder
{
    /**
     * Run the database seeds for SEPTEMBER 2026 Outlook Calendar import.
     * Room Consolidation Rule:
     * - Multi-room bookings containing 'Seminar Room 1' and 'Seminar Room 2' are combined under 'Seminar Room 1'.
     * - Multi-room bookings containing 'Europium Room' and 'Samarium Room' are combined under 'Training Room 1 (Samarium)'.
     */
    public function run(): void
    {
        $defaultPassword = Hash::make('password');

        // 1. Ensure all users from September 2026 Outlook printout exist in `users` table
        $organizersAndAttendees = [
            ['name' => 'Farah Natasya Mohd Safuan', 'email' => 'farah.safuan@mimos.my', 'department' => 'L&D'],
            ['name' => 'Adilah Nisman', 'email' => 'adilah.nisman@mimos.my', 'department' => 'Facility Management'],
            ['name' => 'Fatin Firzana Abdul Pata', 'email' => 'fatin.pata@mimos.my', 'department' => 'MIMOS Academy'],
            ['name' => 'Saidatul Farrah Muhammad Johar', 'email' => 'farrah.johar@mimos.my', 'department' => 'AI Division'],
            ['name' => 'Zalina Sayuti', 'email' => 'zalina@mimos.my', 'department' => 'Administration'],
            ['name' => 'Mohd Suhairi Ahmad Soobni', 'email' => 'suhairi.soobni@mimos.my', 'department' => 'R&D'],
            ['name' => 'Dr. Muhammad Afiq Azmi', 'email' => 'muhammadafiq.azmi@mimos.my', 'department' => 'Research'],
            ['name' => 'Ir. Dr. Ahmad Nizar Harun', 'email' => 'nizar.harun@mimos.my', 'department' => 'Engineering'],
            ['name' => 'Mohd Abu Sa\'id Abdul Razak', 'email' => 'abu.razak@mimos.my', 'department' => 'Management'],
            ['name' => 'Nur Faizah Afiqah Mansor', 'email' => 'afiqah.mansor@mimos.my', 'department' => 'MIMOS Academy'],
            ['name' => 'Nur Asyifa Azani Azmi', 'email' => 'asyifa.azmi@mimos.my', 'department' => 'Academy'],
            ['name' => 'Lee Mai Woon', 'email' => 'mw.lee@mimos.my', 'department' => 'External Relations'],
            ['name' => 'Nurul Aina Syadirah Abdul Razak', 'email' => 'aina.razak@mimos.my', 'department' => 'Quantum Tech'],
            ['name' => 'Ainur Najwa Mohd Rodzi', 'email' => 'ainur.rodzi@mimos.my', 'department' => 'MIMOS Academy'],
            ['name' => 'Siti Sarah Ramli', 'email' => 'sitisarah.ramli@mimos.my', 'department' => 'Management'],
            ['name' => 'Muhamad Amri Ismail', 'email' => 'amris@mimos.my', 'department' => 'Training Operations'],
            ['name' => 'Fuziah Abdul Rahim', 'email' => 'fuziah.rahim@mimos.my', 'department' => 'Administration'],
            ['name' => 'Muhammad Qusyairi Zolkefle', 'email' => 'qusyairi.zolkefle@mimos.my', 'department' => 'IT'],
            ['name' => 'Nur Aleeya Amran', 'email' => 'aleeya.amran@mimos.my', 'department' => 'Operations'],
            ['name' => 'Aisyah Humairah Najihah Nor Alias', 'email' => 'aisyah.alias@mimos.my', 'department' => 'Academy'],
            ['name' => 'MIMOS Academy', 'email' => 'academy@mimos.my', 'department' => 'Academy'],
        ];

        $usersMap = [];
        foreach ($organizersAndAttendees as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => $defaultPassword,
                    'role' => UserRole::User,
                    'user_type' => 'internal',
                    'department' => $userData['department'],
                ]
            );
            $usersMap[$userData['email']] = $user->id;
        }

        // 2. Room lookup helper with Consolidation Rules applied
        $getRoomId = function (string $roomIdentifier): ?int {
            if (str_contains($roomIdentifier, 'Seminar Room 1') || str_contains($roomIdentifier, 'Seminar Room 2')) {
                $roomIdentifier = 'Seminar Room 1';
            } elseif (str_contains($roomIdentifier, 'Europium') || str_contains($roomIdentifier, 'Samarium')) {
                $roomIdentifier = 'Samarium';
            }

            $room = Room::where('name', 'LIKE', "%{$roomIdentifier}%")->first();
            return $room ? $room->id : null;
        };

        // 3. Define Cleaned, Consolidated Events extracted from September 2026 PDF
        $events = [
            // Sept 2: Placeholder KYMC (Combined in Seminar Room 1)
            [
                'title' => 'Placeholder: KYMC',
                'description' => 'KYMC Program Placeholder (Combined in Seminar Room 1)',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-09-02 08:00:00',
                'end_time' => '2026-09-02 17:00:00',
                'attendees' => 2,
                'status' => BookingStatus::Pending,
            ],
            // Sept 7-8: MIMOS Academy Training
            [
                'title' => 'MIMOS Academy Training',
                'description' => 'MIMOS Academy internal training session',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Seminar Room 1',
                'recurrence_dates' => [
                    ['2026-09-07 09:00:00', '2026-09-07 17:00:00'],
                    ['2026-09-08 09:00:00', '2026-09-08 17:00:00'],
                ],
                'attendees' => 15,
                'status' => BookingStatus::Approved,
            ],
            // Sept 9-10: L&D In-house (Combined in Seminar Room 1)
            [
                'title' => 'L&D In-house',
                'description' => 'L&D In-house Training Program (Combined in Seminar Room 1)',
                'organizer_email' => 'farah.safuan@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-09-09 08:30:00',
                'end_time' => '2026-09-10 17:30:00',
                'attendees' => 20,
                'status' => BookingStatus::Approved,
            ],
            // Sept 10: Visit ELECTRO
            [
                'title' => 'Visit ELECTRO',
                'description' => 'ELECTRO Visit in BDA Lab',
                'organizer_email' => 'zalina@mimos.my',
                'room' => 'BDA Lab',
                'start_time' => '2026-09-10 08:00:00',
                'end_time' => '2026-09-10 13:00:00',
                'attendees' => 5,
                'status' => BookingStatus::Approved,
            ],
            // Sept 14-15: [PLACEHOLDER]: Claude AI
            [
                'title' => '[PLACEHOLDER]: Claude AI',
                'description' => 'Public Training Placeholder: Claude AI in BDA Lab',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'BDA Lab',
                'start_time' => '2026-09-14 08:00:00',
                'end_time' => '2026-09-15 17:30:00',
                'attendees' => 10,
                'status' => BookingStatus::Pending,
            ],
            // Sept 15: Placeholder: pic fqa (Combined in Seminar Room 1)
            [
                'title' => 'Placeholder: pic fqa',
                'description' => 'Placeholder booking for pic fqa (Combined in Seminar Room 1)',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-09-15 08:00:00',
                'end_time' => '2026-09-15 17:00:00',
                'attendees' => 3,
                'status' => BookingStatus::Pending,
            ],
            // Sept 17-23: Placeholder (Booked for Ms Mai Woon)
            [
                'title' => 'External Event - Ms Mai Woon',
                'description' => 'Room booking for Ms Mai Woon (External event, liaise on quotation)',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Magnesium',
                'start_time' => '2026-09-17 08:00:00',
                'end_time' => '2026-09-23 17:00:00',
                'attendees' => 5,
                'status' => BookingStatus::Pending,
            ],
            // Sept 22: [PLACEHOLDER]: MIMOS QUANTUM DAY (BDA Lab & Argon Room)
            [
                'title' => '[PLACEHOLDER]: MIMOS QUANTUM DAY',
                'description' => 'MIMOS Quantum Day event session',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'BDA Lab',
                'start_time' => '2026-09-22 08:00:00',
                'end_time' => '2026-09-22 17:30:00',
                'attendees' => 15,
                'status' => BookingStatus::Pending,
            ],
            [
                'title' => '[PLACEHOLDER]: MIMOS QUANTUM DAY',
                'description' => 'MIMOS Quantum Day event session',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Argon Room',
                'start_time' => '2026-09-22 08:00:00',
                'end_time' => '2026-09-22 17:30:00',
                'attendees' => 15,
                'status' => BookingStatus::Pending,
            ],
            // Sept 22: MIMOS Quantum Day (booked for Aina) (Combined in Seminar Room 1)
            [
                'title' => 'MIMOS Quantum Day (booked for Aina)',
                'description' => 'MIMOS Quantum Day session (Combined in Seminar Room 1)',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-09-22 08:30:00',
                'end_time' => '2026-09-22 17:30:00',
                'attendees' => 15,
                'status' => BookingStatus::Approved,
            ],
            // Sept 23-24: L&D In-house (Combined in Seminar Room 1)
            [
                'title' => 'L&D In-house',
                'description' => 'L&D In-house Training Program (Combined in Seminar Room 1)',
                'organizer_email' => 'farah.safuan@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-09-23 08:30:00',
                'end_time' => '2026-09-24 17:30:00',
                'attendees' => 20,
                'status' => BookingStatus::Approved,
            ],
            // Sept 25: MIMOS Mgmt Office (in-house) -Fqa (Combined in Seminar Room 1)
            [
                'title' => 'MIMOS Mgmt Office (in-house) -Fqa',
                'description' => 'Management office session (Combined in Seminar Room 1)',
                'organizer_email' => 'zalina@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-09-25 08:00:00',
                'end_time' => '2026-09-25 17:30:00',
                'attendees' => 12,
                'status' => BookingStatus::Approved,
            ],
            // Sept 29 - Oct 1: PLACEHOLDER: ISTIC-MIMOS International Workshop on Quantum Intelligence.
            [
                'title' => 'PLACEHOLDER: ISTIC-MIMOS International Workshop on Quantum Intelligence',
                'description' => 'ISTIC-MIMOS International Workshop placeholder (Combined in Seminar Room 1)',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-09-29 08:00:00',
                'end_time' => '2026-10-01 17:30:00',
                'attendees' => 30,
                'status' => BookingStatus::Pending,
            ],
            // Sept 29: [PLACEHOLDER]: MIMOS QUANTUM DAY (BDA Lab)
            [
                'title' => '[PLACEHOLDER]: MIMOS QUANTUM DAY',
                'description' => 'MIMOS Quantum Day event session in BDA Lab',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'BDA Lab',
                'start_time' => '2026-09-29 08:00:00',
                'end_time' => '2026-09-29 17:30:00',
                'attendees' => 15,
                'status' => BookingStatus::Pending,
            ],
            // Sept 1 - Sept 18: Adilah Nisman Daily Recurring Operations in Argon Room
            [
                'title' => 'Facility Operations - Adilah Nisman',
                'description' => 'Facility management operations & coordination in Argon Room',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Argon Room',
                'recurrence_dates' => [
                    ['2026-09-01 09:00:00', '2026-09-01 17:00:00'],
                    ['2026-09-02 09:00:00', '2026-09-02 17:00:00'],
                    ['2026-09-03 09:00:00', '2026-09-03 17:00:00'],
                    ['2026-09-04 09:00:00', '2026-09-04 17:00:00'],
                    ['2026-09-07 09:00:00', '2026-09-07 17:00:00'],
                    ['2026-09-08 09:00:00', '2026-09-08 17:00:00'],
                    ['2026-09-09 09:00:00', '2026-09-09 17:00:00'],
                    ['2026-09-10 09:00:00', '2026-09-10 17:00:00'],
                    ['2026-09-11 09:00:00', '2026-09-11 17:00:00'],
                    ['2026-09-14 09:00:00', '2026-09-14 17:00:00'],
                    ['2026-09-15 09:00:00', '2026-09-15 17:00:00'],
                    ['2026-09-16 09:00:00', '2026-09-16 17:00:00'],
                    ['2026-09-17 09:00:00', '2026-09-17 17:00:00'],
                    ['2026-09-18 09:00:00', '2026-09-18 17:00:00'],
                ],
                'attendees' => 5,
                'status' => BookingStatus::Approved,
            ],
        ];

        // 4. Insert bookings into database
        foreach ($events as $event) {
            $userId = $usersMap[$event['organizer_email']] ?? reset($usersMap);
            $roomId = $getRoomId($event['room']);

            if (! $roomId) {
                continue;
            }

            $recurrenceGroupId = isset($event['recurrence_dates']) ? Str::uuid()->toString() : null;

            if (isset($event['recurrence_dates'])) {
                foreach ($event['recurrence_dates'] as $dateSlot) {
                    Booking::create([
                        'user_id' => $userId,
                        'room_id' => $roomId,
                        'title' => $event['title'],
                        'description' => $event['description'],
                        'start_time' => $dateSlot[0],
                        'end_time' => $dateSlot[1],
                        'attendees' => $event['attendees'],
                        'status' => $event['status'],
                        'recurrence_group_id' => $recurrenceGroupId,
                        'approved_by' => ($event['status'] === BookingStatus::Approved) ? $userId : null,
                        'approved_at' => ($event['status'] === BookingStatus::Approved) ? now() : null,
                    ]);
                }
            } else {
                Booking::create([
                    'user_id' => $userId,
                    'room_id' => $roomId,
                    'title' => $event['title'],
                    'description' => $event['description'],
                    'start_time' => $event['start_time'],
                    'end_time' => $event['end_time'],
                    'attendees' => $event['attendees'],
                    'status' => $event['status'],
                    'approved_by' => ($event['status'] === BookingStatus::Approved) ? $userId : null,
                    'approved_at' => ($event['status'] === BookingStatus::Approved) ? now() : null,
                ]);
            }
        }
    }
}
