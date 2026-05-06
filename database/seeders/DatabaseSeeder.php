<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     * Order matters: locations → rooms → users (users reference locations)
     */
    public function run(): void
    {
        $this->call([
            LocationSeeder::class,
            RoomSeeder::class,
            UserSeeder::class,
        ]);
    }
}
