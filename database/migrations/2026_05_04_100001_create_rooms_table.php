<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->constrained()->onDelete('cascade');
            $table->string('name', 100);
            $table->integer('capacity');
            $table->json('amenities')->nullable(); // ["projector", "whiteboard", "video_conferencing"]
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['location_id', 'is_active']);
            $table->index(['capacity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
