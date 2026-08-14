<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extend the role enum with the new room_admin role.
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['user', 'location_admin', 'room_admin', 'super_admin'])
                ->default('user')
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['user', 'location_admin', 'super_admin'])
                ->default('user')
                ->change();
        });
    }
};
