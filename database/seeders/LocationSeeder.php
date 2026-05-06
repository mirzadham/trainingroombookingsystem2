<?php

namespace Database\Seeders;

use App\Models\Location;
use Illuminate\Database\Seeder;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        $locations = [
            [
                'name' => 'Technology Park Malaysia',
                'code' => 'TPM',
                'address' => 'MIMOS Berhad, Technology Park Malaysia, 57000 Kuala Lumpur',
                'is_active' => true,
            ],
            [
                'name' => 'Kulim Hi-Tech Park',
                'code' => 'KHTP',
                'address' => 'MIMOS Berhad, Kulim Hi-Tech Park, 09000 Kulim, Kedah',
                'is_active' => true,
            ],
        ];

        foreach ($locations as $location) {
            Location::create($location);
        }
    }
}
