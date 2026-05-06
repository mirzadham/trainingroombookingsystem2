<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add custom columns to the default Laravel users table
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['user', 'location_admin', 'super_admin'])->default('user')->after('email');
            $table->enum('user_type', ['internal', 'external'])->default('external')->after('role');
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete()->after('user_type');
            $table->string('phone', 20)->nullable()->after('location_id');
            $table->string('department')->nullable()->after('phone');

            $table->index(['role']);
            $table->index(['location_id']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['location_id']);
            $table->dropColumn(['role', 'user_type', 'location_id', 'phone', 'department']);
        });
    }
};
