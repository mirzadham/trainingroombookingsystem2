<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dateTime('reminder_sent_at')->nullable()->after('approved_at');
            $table->index(['status', 'start_time']);
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex(['status', 'start_time']);
            $table->dropColumn('reminder_sent_at');
        });
    }
};
