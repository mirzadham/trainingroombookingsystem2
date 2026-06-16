<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('reference_no', 20)->nullable()->after('id');
        });

        $this->backfill();

        Schema::table('bookings', function (Blueprint $table) {
            $table->string('reference_no', 20)->nullable(false)->change();
            $table->unique('reference_no');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropUnique(['reference_no']);
            $table->dropColumn('reference_no');
        });
    }

    private function backfill(): void
    {
        $pool = 'ABCDEFGHJKMNPQRSTUVWXYZ2346789';
        $used = [];

        $generateBase = function () use ($pool, &$used) {
            do {
                $code = '';
                for ($i = 0; $i < 6; $i++) {
                    $code .= $pool[random_int(0, strlen($pool) - 1)];
                }
                $ref = 'MA-' . $code;
            } while (in_array($ref, $used));
            $used[] = $ref;
            return $ref;
        };

        // 1. Group bookings by recurrence_group_id
        $recurrenceGroups = DB::table('bookings')
            ->whereNotNull('recurrence_group_id')
            ->orderBy('start_time')
            ->get()
            ->groupBy('recurrence_group_id');

        foreach ($recurrenceGroups as $groupId => $bookings) {
            $base = $generateBase();
            foreach ($bookings as $index => $booking) {
                $seq = str_pad($index + 1, 2, '0', STR_PAD_LEFT);
                DB::table('bookings')
                    ->where('id', $booking->id)
                    ->update(['reference_no' => "{$base}-{$seq}"]);
            }
        }

        // 2. Group bookings by group_id (excluding those already updated or having recurrence_group_id)
        $multiDayGroups = DB::table('bookings')
            ->whereNotNull('group_id')
            ->whereNull('reference_no')
            ->orderBy('start_time')
            ->get()
            ->groupBy('group_id');

        foreach ($multiDayGroups as $groupId => $bookings) {
            $base = $generateBase();
            foreach ($bookings as $index => $booking) {
                $seq = str_pad($index + 1, 2, '0', STR_PAD_LEFT);
                DB::table('bookings')
                    ->where('id', $booking->id)
                    ->update(['reference_no' => "{$base}-{$seq}"]);
            }
        }

        // 3. Standalone bookings
        $standaloneBookings = DB::table('bookings')
            ->whereNull('reference_no')
            ->get();

        foreach ($standaloneBookings as $booking) {
            $ref = $generateBase();
            DB::table('bookings')
                ->where('id', $booking->id)
                ->update(['reference_no' => $ref]);
        }
    }
};
