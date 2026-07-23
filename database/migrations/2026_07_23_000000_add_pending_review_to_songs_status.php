<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return; // SQLite 不支援 MODIFY COLUMN，且已將 enum 存為 string，直接支援任意值
        }

        DB::statement("ALTER TABLE songs MODIFY COLUMN status ENUM('draft', 'published', 'pending_review') DEFAULT 'draft'");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE songs MODIFY COLUMN status ENUM('draft', 'published') DEFAULT 'draft'");
    }
};
