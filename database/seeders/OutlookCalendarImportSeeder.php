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

class OutlookCalendarImportSeeder extends Seeder
{
    /**
     * Run the database seeds to automate importing Outlook Calendar PDF entries.
     * Room Consolidation Rule:
     * - Multi-room bookings containing 'Seminar Room 1' and 'Seminar Room 2' are combined under 'Seminar Room 1'.
     * - Multi-room bookings containing 'Europium Room' and 'Samarium Room' are combined under 'Training Room 1 (Samarium)'.
     */
    public function run(): void
    {
        $defaultPassword = Hash::make('password');

        // 1. Ensure all users from Outlook printout exist in `users` table
        $organizersAndAttendees = [
            ['name' => 'Farah Natasya Mohd Safuan', 'email' => 'farah.safuan@mimos.my', 'department' => 'L&D'],
            ['name' => 'Adilah Nisman', 'email' => 'adilah.nisman@mimos.my', 'department' => 'Facility Management'],
            ['name' => 'Harnisah Tajudin', 'email' => 'harnisah@mimos.my', 'department' => 'Training Operations'],
            ['name' => 'Nik Saliza Abdullah', 'email' => 'saliza@mimos.my', 'department' => 'Training Operations'],
            ['name' => 'Nardiatul Kasmi Bt. Mohamed Kassim', 'email' => 'nardiatul.kassim@mimos.my', 'department' => 'Administration'],
            ['name' => 'Fatin Firzana Abdul Pata', 'email' => 'fatin.pata@mimos.my', 'department' => 'MIMOS Academy'],
            ['name' => 'Rohaida Omar', 'email' => 'rohaida.omar@mimos.my', 'department' => 'Human Resources'],
            ['name' => 'Mohd Abu Sa\'id Abdul Razak', 'email' => 'abu.razak@mimos.my', 'department' => 'Management'],
            ['name' => 'Ir. Dr. Ahmad Nizar Harun', 'email' => 'nizar.harun@mimos.my', 'department' => 'Engineering'],
            ['name' => 'Mohd Suhairi Ahmad Soobni', 'email' => 'suhairi.soobni@mimos.my', 'department' => 'R&D'],
            ['name' => 'Dr. Muhammad Afiq Azmi', 'email' => 'muhammadafiq.azmi@mimos.my', 'department' => 'Research'],
            ['name' => 'MIMOS Academy', 'email' => 'academy@mimos.my', 'department' => 'Academy'],
            ['name' => 'Omar Khalid Azmi', 'email' => 'omar.azmi@mimos.my', 'department' => 'Executive'],
            ['name' => 'Mazlina Montak', 'email' => 'mazlina.montak@mimos.my', 'department' => 'Programs'],
            ['name' => 'Nurfatihah Syamimi Mohamad Sam', 'email' => 'nurfatihah.sam@mimos.my', 'department' => 'Training Operations'],
            ['name' => 'Zalina Sayuti', 'email' => 'zalina@mimos.my', 'department' => 'Administration'],
            ['name' => 'Nur Faizah Afiqah Mansor', 'email' => 'afiqah.mansor@mimos.my', 'department' => 'MIMOS Academy'],
            ['name' => 'Saidatul Farrah Muhammad Johar', 'email' => 'farrah.johar@mimos.my', 'department' => 'AI Division'],
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

        // 2. Room lookup helper with Consolidation Rules applied:
        // - Seminar Room 1 + Seminar Room 2 => Seminar Room 1
        // - Europium Room + Samarium Room => Training Room 1 (Samarium)
        $getRoomId = function (string $roomIdentifier): ?int {
            // Apply Consolidation Rules
            if (str_contains($roomIdentifier, 'Seminar Room 1') || str_contains($roomIdentifier, 'Seminar Room 2')) {
                $roomIdentifier = 'Seminar Room 1';
            } elseif (str_contains($roomIdentifier, 'Europium') || str_contains($roomIdentifier, 'Samarium')) {
                $roomIdentifier = 'Samarium';
            }

            $room = Room::where('name', 'LIKE', "%{$roomIdentifier}%")->first();

            return $room ? $room->id : null;
        };

        // 3. Define Cleaned, Consolidated & Deduplicated Events extracted from PDF
        $events = [
            // Aug 5-6: L&D In-house (Combined under Seminar Room 1)
            [
                'title' => 'L&D In-house',
                'description' => 'L&D In-house Training Program (Combined in Seminar Room 1)',
                'organizer_email' => 'farah.safuan@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-08-05 08:30:00',
                'end_time' => '2026-08-06 17:30:00',
                'attendees' => 20,
                'status' => BookingStatus::Approved,
            ],
            // Aug 5: Booked for Facility (Combined under Training Room 1 Samarium)
            [
                'title' => 'Booked for Facility',
                'description' => 'Facility reservation by Adilah Nisman (Combined in Samarium Room)',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Samarium',
                'start_time' => '2026-08-05 14:00:00',
                'end_time' => '2026-08-05 17:00:00',
                'attendees' => 3,
                'status' => BookingStatus::Approved,
            ],
            // Aug 6: MHSB Townhall
            [
                'title' => 'MHSB Townhall (Booked for Anna)',
                'description' => 'MHSB Townhall session in BDA Lab',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'BDA Lab',
                'start_time' => '2026-08-06 15:00:00',
                'end_time' => '2026-08-06 17:00:00',
                'attendees' => 2,
                'status' => BookingStatus::Approved,
            ],
            // Aug 7: PLACEHOLDER: PIC ROHAIDA (Combined under Seminar Room 1)
            [
                'title' => '[PLACEHOLDER]: PIC ROHAIDA',
                'description' => 'Placeholder booking by Fatin Firzana for PIC Rohaida (Combined in Seminar Room 1)',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-08-07 08:00:00',
                'end_time' => '2026-08-07 17:00:00',
                'attendees' => 3,
                'status' => BookingStatus::Pending,
            ],
            // Aug 10-14: CONFIRMED: TTT iKMA (5-day training)
            [
                'title' => 'CONFIRMED: TTT iKMA',
                'description' => 'Please be informed that IKMA Chief Executive Officer has agreed on this date for Train-The-Trainer. Further details will be included later.',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'BDA Lab',
                'start_time' => '2026-08-10 08:00:00',
                'end_time' => '2026-08-14 17:00:00',
                'attendees' => 6,
                'status' => BookingStatus::Approved,
            ],
            // Aug 10: PLACEHOLDER: MSSB Talk Program
            [
                'title' => 'PLACEHOLDER: MSSB Talk Program',
                'description' => 'MSSB Talk Program placeholder booking',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-08-10 08:00:00',
                'end_time' => '2026-08-10 17:00:00',
                'attendees' => 3,
                'status' => BookingStatus::Pending,
            ],
            // Aug 11 & Aug 18: Placeholder: PIC Syamimi (Combined under Seminar Room 1)
            [
                'title' => 'Placeholder: PIC Syamimi',
                'description' => 'Placeholder booking for PIC Syamimi (Combined in Seminar Room 1)',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-08-11 08:00:00',
                'end_time' => '2026-08-11 17:30:00',
                'attendees' => 2,
                'status' => BookingStatus::Pending,
            ],
            [
                'title' => 'Placeholder: PIC Syamimi',
                'description' => 'Placeholder booking for PIC Syamimi (Combined in Seminar Room 1)',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-08-18 08:00:00',
                'end_time' => '2026-08-18 17:30:00',
                'attendees' => 2,
                'status' => BookingStatus::Pending,
            ],
            // Aug 11, Aug 18, Aug 19-20: Zalina Sayuti Meetings
            [
                'title' => 'Internal Meeting - Zalina Sayuti',
                'description' => 'Department meeting in Argon Room',
                'organizer_email' => 'zalina@mimos.my',
                'room' => 'Argon Room',
                'start_time' => '2026-08-11 08:30:00',
                'end_time' => '2026-08-11 17:30:00',
                'attendees' => 5,
                'status' => BookingStatus::Approved,
            ],
            [
                'title' => 'Internal Meeting - Zalina Sayuti',
                'description' => 'Department meeting in Argon Room',
                'organizer_email' => 'zalina@mimos.my',
                'room' => 'Argon Room',
                'start_time' => '2026-08-18 08:30:00',
                'end_time' => '2026-08-18 17:30:00',
                'attendees' => 5,
                'status' => BookingStatus::Approved,
            ],
            [
                'title' => 'Internal Meeting - Zalina Sayuti',
                'description' => 'Microsoft Teams Meeting & Argon Room Session',
                'organizer_email' => 'zalina@mimos.my',
                'room' => 'Argon Room',
                'start_time' => '2026-08-19 08:00:00',
                'end_time' => '2026-08-20 17:30:00',
                'attendees' => 5,
                'status' => BookingStatus::Approved,
            ],
            // Aug 12-13: Fatin Firzana Abdul Pata Meeting
            [
                'title' => 'MIMOS Academy Workshop - Fatin Firzana',
                'description' => 'Academy workshop session in Argon Room',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'Argon Room',
                'start_time' => '2026-08-12 08:30:00',
                'end_time' => '2026-08-13 17:30:00',
                'attendees' => 3,
                'status' => BookingStatus::Approved,
            ],
            // Aug 12-13: MS 56001 Seminar (JSM) (Combined under Seminar Room 1)
            [
                'title' => 'MS 56001 Seminar (JSM)',
                'description' => 'JSM Standard Seminar MS 56001 (Combined in Seminar Room 1)',
                'organizer_email' => 'zalina@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-08-12 08:00:00',
                'end_time' => '2026-08-13 17:30:00',
                'attendees' => 25,
                'status' => BookingStatus::Approved,
            ],
            // Aug 12 & Aug 18: Eldorado Brazil Training
            [
                'title' => 'Eldorado Brazil Training (Booked for Harnisah)',
                'description' => 'Eldorado Brazil Training program',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Magnesium Room',
                'start_time' => '2026-08-12 09:00:00',
                'end_time' => '2026-08-12 17:00:00',
                'attendees' => 3,
                'status' => BookingStatus::Approved,
            ],
            [
                'title' => 'Eldorado Brazil Training (Booked for Harnisah)',
                'description' => 'Eldorado Brazil Training program',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Magnesium Room',
                'start_time' => '2026-08-18 09:00:00',
                'end_time' => '2026-08-18 17:00:00',
                'attendees' => 3,
                'status' => BookingStatus::Approved,
            ],
            // Aug 17-21: K-Youth Series (Recurring daily)
            [
                'title' => 'K-Youth Program',
                'description' => 'K-Youth Training Program',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'BDA Lab',
                'recurrence_dates' => [
                    ['2026-08-17 09:00:00', '2026-08-17 17:00:00'],
                    ['2026-08-18 09:00:00', '2026-08-18 17:00:00'],
                    ['2026-08-19 09:00:00', '2026-08-19 17:00:00'],
                    ['2026-08-20 09:00:00', '2026-08-20 17:00:00'],
                    ['2026-08-21 09:00:00', '2026-08-21 17:00:00'],
                ],
                'attendees' => 15,
                'status' => BookingStatus::Approved,
            ],
            // Aug 17: MBM 7.0 - Booked for Fqa (Combined under Seminar Room 1)
            [
                'title' => 'MBM 7.0 - Booked for Fqa',
                'description' => 'MBM 7.0 Training session (Combined in Seminar Room 1)',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Seminar Room 1',
                'start_time' => '2026-08-17 09:30:00',
                'end_time' => '2026-08-17 12:30:00',
                'attendees' => 10,
                'status' => BookingStatus::Approved,
            ],
            // Aug 19-20: Quantum Training
            [
                'title' => 'Quantum Training',
                'description' => 'Quantum Technology Training Course',
                'organizer_email' => 'zalina@mimos.my',
                'room' => 'Magnesium Room',
                'start_time' => '2026-08-19 08:30:00',
                'end_time' => '2026-08-20 17:30:00',
                'attendees' => 12,
                'status' => BookingStatus::Approved,
            ],
            // Aug 17-31: JMTI Series (Combined under Training Room 1 Samarium across 11 dates)
            [
                'title' => 'JMTI Program',
                'description' => 'JMTI Technical Training Series (Combined in Samarium Room)',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Samarium',
                'recurrence_dates' => [
                    ['2026-08-17 09:00:00', '2026-08-17 17:00:00'],
                    ['2026-08-18 09:00:00', '2026-08-18 17:00:00'],
                    ['2026-08-19 09:00:00', '2026-08-19 17:00:00'],
                    ['2026-08-20 09:00:00', '2026-08-20 17:00:00'],
                    ['2026-08-21 09:00:00', '2026-08-21 17:00:00'],
                    ['2026-08-24 09:00:00', '2026-08-24 17:00:00'],
                    ['2026-08-25 09:00:00', '2026-08-25 17:00:00'],
                    ['2026-08-26 09:00:00', '2026-08-26 17:00:00'],
                    ['2026-08-27 09:00:00', '2026-08-27 17:00:00'],
                    ['2026-08-28 09:00:00', '2026-08-28 17:00:00'],
                    ['2026-08-31 09:00:00', '2026-08-31 17:00:00'],
                ],
                'attendees' => 20,
                'status' => BookingStatus::Approved,
            ],
            // Aug 24-31: Adilah Nisman Meetings (Recurring daily)
            [
                'title' => 'Facility Operations - Adilah Nisman',
                'description' => 'Facility management operations & coordination',
                'organizer_email' => 'adilah.nisman@mimos.my',
                'room' => 'Argon Room',
                'recurrence_dates' => [
                    ['2026-08-24 09:00:00', '2026-08-24 17:00:00'],
                    ['2026-08-25 09:00:00', '2026-08-25 17:00:00'],
                    ['2026-08-26 09:00:00', '2026-08-26 17:00:00'],
                    ['2026-08-27 09:00:00', '2026-08-27 17:00:00'],
                    ['2026-08-28 09:00:00', '2026-08-28 17:00:00'],
                    ['2026-08-31 09:00:00', '2026-08-31 17:00:00'],
                ],
                'attendees' => 5,
                'status' => BookingStatus::Approved,
            ],
            // Aug 26-27: TRAINING: JPN AI CHATBOT
            [
                'title' => 'TRAINING: JPN AI CHATBOT',
                'description' => 'JPN AI Chatbot Technical Training Session',
                'organizer_email' => 'fatin.pata@mimos.my',
                'room' => 'BDA Lab',
                'start_time' => '2026-08-26 08:30:00',
                'end_time' => '2026-08-27 17:30:00',
                'attendees' => 15,
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
