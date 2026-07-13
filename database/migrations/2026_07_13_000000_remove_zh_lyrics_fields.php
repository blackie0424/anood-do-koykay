<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('song_lines', function (Blueprint $table) {
            $table->dropColumn('text_zh');
        });

        Schema::table('songs', function (Blueprint $table) {
            $table->dropColumn('show_zh_lyrics');
        });
    }

    public function down(): void
    {
        Schema::table('song_lines', function (Blueprint $table) {
            $table->string('text_zh')->nullable();
        });

        Schema::table('songs', function (Blueprint $table) {
            $table->boolean('show_zh_lyrics')->default(false);
        });
    }
};
