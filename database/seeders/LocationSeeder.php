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
                'image_url' => '/images/locations/tpm.png',
                'description' => 'Technology Park Malaysia.',
                'is_active' => true,
            ],
            [
                'name' => 'Kulim Hi-Tech Park',
                'code' => 'KHTP',
                'address' => 'MIMOS Berhad, Kulim Hi-Tech Park, 09000 Kulim, Kedah',
                'image_url' => '/images/locations/khtp.png',
                'description' => 'Kulim Hi-Tech Park.',
                'is_active' => true,
            ],
        ];

        foreach ($locations as $location) {
            Location::updateOrCreate(
                ['code' => $location['code']],
                $location
            );
        }
    }
}
