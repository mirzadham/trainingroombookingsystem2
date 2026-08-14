#!/usr/bin/env php
<?php

/**
 * Fixture helper for Playwright E2E tests.
 *
 * Bootstraps the Laravel app and manipulates the DEV database directly so
 * the E2E suite has deterministic users, rooms, and bookings to assert
 * against. Never run against production.
 *
 * Usage:
 *   php tests/e2e/helpers/fixtures.php seed
 *   php tests/e2e/helpers/fixtures.php invite <email> <role> <location_id> <room_id_csv>
 *   php tests/e2e/helpers/fixtures.php reset
 *
 * Output: single-line JSON on stdout (consumed by the Playwright specs).
 */

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\AdminInvitation;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

require __DIR__.'/../../../vendor/autoload.php';

$app = require __DIR__.'/../../../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

if (app()->environment('production')) {
    fwrite(STDERR, "Refusing to run fixtures against production.\n");
    exit(1);
}

const SUPER_EMAIL = 'e2e.superadmin@example.com';
const SUPER_PASSWORD = 'E2eSuperAdmin!23';
const USER_EMAIL = 'e2e.user@example.com';
const USER_PASSWORD = 'E2eUser!2345';
const ROOM_ADMIN_EMAIL = 'e2e.roomadmin@example.com';
const ROOM_ADMIN_PASSWORD = 'E2eRoomAdmin!23';
const ROOM_ALPHA = 'E2E Room Alpha';
const ROOM_BETA = 'E2E Room Beta';
const ROOM_GAMMA = 'E2E Room Gamma (KHTP)';

function out(array $payload): never
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit(0);
}

function fail(string $message): never
{
    fwrite(STDERR, $message."\n");
    exit(1);
}

/** Ensure a user exists with the given role and credentials. */
function ensureUser(string $email, string $password, UserRole $role, ?int $locationId = null): User
{
    $user = User::where('email', $email)->first();

    if ($user) {
        $user->update([
            'password' => Hash::make($password),
            'role' => $role,
            'location_id' => $locationId,
            'user_type' => $role === UserRole::User ? 'external' : 'internal',
            'status' => 'active',
        ]);

        return $user->fresh();
    }

    return User::create([
        'name' => 'E2E '.ucwords(str_replace(['.', '@'], [' ', ''], $email)),
        'email' => $email,
        'password' => Hash::make($password),
        'role' => $role,
        'user_type' => $role === UserRole::User ? 'external' : 'internal',
        'location_id' => $locationId,
        'status' => 'active',
        'phone' => '+60120000000',
        'department' => 'E2E Testing',
    ]);
}

/** Ensure an E2E room exists in the location (active). */
function ensureRoom(Location $location, string $name, int $capacity): Room
{
    $room = Room::where('location_id', $location->id)->where('name', $name)->first();

    if ($room) {
        $room->update(['is_active' => true, 'capacity' => $capacity]);

        return $room->fresh();
    }

    return Room::create([
        'location_id' => $location->id,
        'name' => $name,
        'capacity' => $capacity,
        'amenities' => ['projector', 'wifi'],
        'description' => 'Room created by the E2E fixture helper.',
        'is_active' => true,
        'image_url' => '/images/rooms/default.png',
    ]);
}

function seed(): void
{
    $tpm = Location::where('code', 'TPM')->first() ?? Location::first();
    if (! $tpm) {
        $tpm = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'Kuala Lumpur']);
    }

    $khtp = Location::where('code', 'KHTP')->first();
    if (! $khtp) {
        $khtp = Location::create(['name' => 'Kulim Hi-Tech Park', 'code' => 'KHTP', 'address' => 'Kedah']);
    }

    // Roles / users
    $super = ensureUser(SUPER_EMAIL, SUPER_PASSWORD, UserRole::SuperAdmin, null);
    $user = ensureUser(USER_EMAIL, USER_PASSWORD, UserRole::User, null);
    $roomAdmin = ensureUser(ROOM_ADMIN_EMAIL, ROOM_ADMIN_PASSWORD, UserRole::RoomAdmin, $tpm->id);

    // Rooms: two in TPM (one assigned, one NOT assigned to the room admin),
    // one in KHTP (cross-campus control).
    $alpha = ensureRoom($tpm, ROOM_ALPHA, 20);
    $beta = ensureRoom($tpm, ROOM_BETA, 20);
    $gamma = ensureRoom($khtp, ROOM_GAMMA, 15);

    // Room admin is assigned ONLY the alpha room.
    $roomAdmin->adminRooms()->sync([$alpha->id]);

    // Prune stray bookings in the E2E rooms (leftovers from previous runs or
    // manual debugging) so scoping counts stay deterministic.
    Booking::whereIn('room_id', [$alpha->id, $beta->id, $gamma->id])
        ->whereNotIn('title', ['E2E Assigned Room Booking', 'E2E Other Room Booking', 'E2E KHTP Room Booking'])
        ->delete();

    // Booking fixtures: pending in the assigned room (approvable), pending in
    // the other TPM room (must be denied), pending in the KHTP room.
    $start = now()->addDays(3)->setTime(10, 0, 0);
    $end = $start->copy()->addHours(2);

    $assignedBooking = Booking::updateOrCreate(
        ['title' => 'E2E Assigned Room Booking'],
        [
            'user_id' => $user->id,
            'room_id' => $alpha->id,
            'start_time' => $start,
            'end_time' => $end,
            'attendees' => 5,
            'phone' => '+60120000000',
            'status' => BookingStatus::Pending,
        ]
    );

    $otherBooking = Booking::updateOrCreate(
        ['title' => 'E2E Other Room Booking'],
        [
            'user_id' => $user->id,
            'room_id' => $beta->id,
            'start_time' => $start->copy()->addDays(1),
            'end_time' => $end->copy()->addDays(1),
            'attendees' => 5,
            'phone' => '+60120000000',
            'status' => BookingStatus::Pending,
        ]
    );

    $khtpBooking = Booking::updateOrCreate(
        ['title' => 'E2E KHTP Room Booking'],
        [
            'user_id' => $user->id,
            'room_id' => $gamma->id,
            'start_time' => $start->copy()->addDays(2),
            'end_time' => $end->copy()->addDays(2),
            'attendees' => 5,
            'phone' => '+60120000000',
            'status' => BookingStatus::Pending,
        ]
    );

    out([
        'superAdmin' => ['email' => SUPER_EMAIL, 'password' => SUPER_PASSWORD],
        'regularUser' => ['email' => USER_EMAIL, 'password' => USER_PASSWORD],
        'roomAdmin' => ['email' => ROOM_ADMIN_EMAIL, 'password' => ROOM_ADMIN_PASSWORD],
        'locations' => [
            'tpm' => ['id' => $tpm->id, 'name' => $tpm->name],
            'khtp' => ['id' => $khtp->id, 'name' => $khtp->name],
        ],
        'assignedRoom' => ['id' => $alpha->id, 'name' => $alpha->name],
        'otherRoom' => ['id' => $beta->id, 'name' => $beta->name],
        'khtpRoom' => ['id' => $gamma->id, 'name' => $gamma->name],
        'assignedBookingId' => $assignedBooking->id,
        'otherBookingId' => $otherBooking->id,
        'khtpBookingId' => $khtpBooking->id,
    ]);
}

function invite(string $email, string $role, string $locationId, string $roomIdsCsv): void
{
    if (! in_array($role, ['location_admin', 'room_admin', 'super_admin'], true)) {
        fail("Invalid role: {$role}");
    }

    $locationId = $locationId === '' ? null : (int) $locationId;
    $roomIds = array_values(array_filter(array_map('intval', explode(',', $roomIdsCsv))));

    // Clean up previous E2E invites for this email.
    AdminInvitation::where('email', $email)->delete();

    $invitation = AdminInvitation::create([
        'email' => $email,
        'role' => $role,
        'location_id' => $locationId,
        'token' => Str::random(60),
        'invited_by' => User::where('email', SUPER_EMAIL)->value('id') ?? User::first()->id,
        'expires_at' => now()->addHours(48),
    ]);

    if ($role === 'room_admin' && $roomIds) {
        $invitation->rooms()->attach($roomIds);
    }

    out([
        'id' => $invitation->id,
        'email' => $invitation->email,
        'role' => $invitation->role,
        'token' => $invitation->token,
    ]);
}

function resetFixtures(): void
{
    // Remove E2E invitations and users by email pattern (covers every email
    // the specs create, including timestamped invite-only addresses).
    AdminInvitation::where('email', 'like', 'e2e.%@example.com')->delete();
    User::where('email', 'like', 'e2e.%@example.com')->delete();

    // Remove bookings in E2E rooms, then the rooms themselves
    // (pivot rows cascade via FKs).
    $e2eRoomIds = Room::whereIn('name', [ROOM_ALPHA, ROOM_BETA, ROOM_GAMMA])->pluck('id');
    Booking::whereIn('room_id', $e2eRoomIds)->delete();
    Room::whereIn('id', $e2eRoomIds)->delete();

    out(['reset' => true]);
}

/** Clear login/invitation rate-limiters so the E2E suite can work repeatedly. */
function clearThrottle(): void
{
    // ThrottleRequests hashes limiter keys: md5(limiterName . limitKey) where
    // limitKey is the client IP. Clearing the limiter *name* is a no-op, so
    // clear the real cache entries (plus their :timer counterparts).
    foreach (['auth-login', 'auth-admin-login', 'auth-invitations'] as $name) {
        Illuminate\Support\Facades\RateLimiter::clear(md5($name.'127.0.0.1'));
    }

    out(['throttle' => 'cleared']);
}

$command = $argv[1] ?? '';

match ($command) {
    'seed' => seed(),
    'invite' => invite($argv[2] ?? fail('Usage: invite <email> <role> <location_id> <room_id_csv>'), $argv[3] ?? 'room_admin', $argv[4] ?? '', $argv[5] ?? ''),
    'reset' => resetFixtures(),
    'clear-throttle' => clearThrottle(),
    default => fail("Unknown command: {$command}. Use seed, invite, reset, or clear-throttle."),
};
