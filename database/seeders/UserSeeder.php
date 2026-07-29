<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds for LOCAL DEVELOPMENT ONLY.
     * Passwords default to 'password' or env('SEED_ADMIN_PASSWORD').
     */
    public function run(): void
    {
        $tpm = Location::where('code', 'TPM')->first();
        $khtp = Location::where('code', 'KHTP')->first();

        $defaultPassword = Hash::make(env('SEED_ADMIN_PASSWORD', 'password'));

        // Super Admin (Mock Local Account)
        User::create([
            'name' => 'Super Admin (Dev)',
            'email' => 'superadmin@mimos.test',
            'password' => $defaultPassword,
            'role' => UserRole::SuperAdmin,
            'user_type' => 'internal',
            'department' => 'IT Administration',
        ]);

        // TPM Location Admin (Mock Local Account)
        User::create([
            'name' => 'TPM Admin (Dev)',
            'email' => 'tpm.admin@mimos.test',
            'password' => $defaultPassword,
            'role' => UserRole::LocationAdmin,
            'user_type' => 'internal',
            'location_id' => $tpm->id,
            'department' => 'Facility Management',
        ]);

        // KHTP Location Admin (Mock Local Account)
        User::create([
            'name' => 'KHTP Admin (Dev)',
            'email' => 'khtp.admin@mimos.test',
            'password' => $defaultPassword,
            'role' => UserRole::LocationAdmin,
            'user_type' => 'internal',
            'location_id' => $khtp->id,
            'department' => 'Facility Management',
        ]);

        // Sample internal user
        User::create([
            'name' => 'Ahmad Razak (Dev User)',
            'email' => 'ahmad.razak@mimos.test',
            'password' => $defaultPassword,
            'role' => UserRole::User,
            'user_type' => 'internal',
            'department' => 'Research & Development',
            'phone' => '+60123456789',
        ]);

        // Sample internal user
        User::create([
            'name' => 'Siti Nurhaliza (Dev User)',
            'email' => 'siti.nurhaliza@mimos.test',
            'password' => $defaultPassword,
            'role' => UserRole::User,
            'user_type' => 'internal',
            'department' => 'Academy',
            'phone' => '+60198765432',
        ]);

        // Sample external user
        User::create([
            'name' => 'John Doe (Dev Guest)',
            'email' => 'john.doe@example.com',
            'password' => $defaultPassword,
            'role' => UserRole::User,
            'user_type' => 'external',
            'phone' => '+60112233445',
        ]);
    }
}
