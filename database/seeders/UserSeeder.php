<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $tpm = Location::where('code', 'TPM')->first();
        $khtp = Location::where('code', 'KHTP')->first();

        // Super Admin
        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@mimos.my',
            'password' => Hash::make('password'),
            'role' => User::ROLE_SUPER_ADMIN,
            'user_type' => 'internal',
            'department' => 'IT Administration',
        ]);

        // TPM Location Admin
        User::create([
            'name' => 'TPM Admin',
            'email' => 'tpm.admin@mimos.my',
            'password' => Hash::make('password'),
            'role' => User::ROLE_LOCATION_ADMIN,
            'user_type' => 'internal',
            'location_id' => $tpm->id,
            'department' => 'Facility Management',
        ]);

        // KHTP Location Admin
        User::create([
            'name' => 'KHTP Admin',
            'email' => 'khtp.admin@mimos.my',
            'password' => Hash::make('password'),
            'role' => User::ROLE_LOCATION_ADMIN,
            'user_type' => 'internal',
            'location_id' => $khtp->id,
            'department' => 'Facility Management',
        ]);

        // Sample internal user
        User::create([
            'name' => 'Ahmad Razak',
            'email' => 'ahmad.razak@mimos.my',
            'password' => Hash::make('password'),
            'role' => User::ROLE_USER,
            'user_type' => 'internal',
            'department' => 'Research & Development',
            'phone' => '+60123456789',
        ]);

        // Sample internal user
        User::create([
            'name' => 'Siti Nurhaliza',
            'email' => 'siti.nurhaliza@mimos.my',
            'password' => Hash::make('password'),
            'role' => User::ROLE_USER,
            'user_type' => 'internal',
            'department' => 'Academy',
            'phone' => '+60198765432',
        ]);

        // Sample external user
        User::create([
            'name' => 'John Doe',
            'email' => 'john.doe@external.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_USER,
            'user_type' => 'external',
            'phone' => '+60112233445',
        ]);
    }
}
