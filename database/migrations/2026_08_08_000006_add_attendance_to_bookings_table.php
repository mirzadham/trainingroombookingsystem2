<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->enum('attendance_status', ['attended', 'no_show'])->nullable()->after('reminder_sent_at');
            $table->foreignId('attendance_marked_by')->nullable()->after('attendance_status')->constrained('users')->nullOnDelete();
            $table->dateTime('attendance_marked_at')->nullable()->after('attendance_marked_by');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['attendance_marked_by']);
            $table->dropColumn(['attendance_status', 'attendance_marked_by', 'attendance_marked_at']);
        });
    }
};
