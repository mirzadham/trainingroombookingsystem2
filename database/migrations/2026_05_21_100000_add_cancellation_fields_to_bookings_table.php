<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->text('cancellation_reason')->nullable()->after('rejection_reason');
            $table->foreignId('cancelled_by')->nullable()->after('cancellation_reason')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['cancelled_by']);
            $table->dropColumn(['cancellation_reason', 'cancelled_by']);
        });
    }
};
