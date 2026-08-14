<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_invitation_room', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_invitation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['admin_invitation_id', 'room_id']);
            $table->index(['room_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_invitation_room');
    }
};
