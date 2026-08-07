<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('room_blackouts', function (Blueprint $table) {
            $table->enum('recurrence', ['none', 'daily', 'weekly', 'monthly'])
                ->default('none')
                ->after('end_time');
            $table->date('recurrence_end_date')->nullable()->after('recurrence');
            $table->json('recurrence_weekdays')->nullable()->after('recurrence_end_date');

            $table->index(['room_id', 'recurrence']);
        });
    }

    public function down(): void
    {
        Schema::table('room_blackouts', function (Blueprint $table) {
            $table->dropIndex(['room_id', 'recurrence']);
            $table->dropColumn(['recurrence', 'recurrence_end_date', 'recurrence_weekdays']);
        });
    }
};
