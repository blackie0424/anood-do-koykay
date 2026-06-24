<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('song_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('song_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('order');
            $table->text('text_native')->nullable();
            $table->text('text_zh')->nullable();
            $table->float('start_time')->nullable();
            $table->float('end_time')->nullable();
            $table->string('audio_line')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('song_lines');
    }
};
