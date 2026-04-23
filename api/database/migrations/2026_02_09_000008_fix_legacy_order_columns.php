<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->fixChaptersOrderColumn();
        $this->fixBlocksColumns();
    }

    public function down(): void
    {
    }

    private function fixChaptersOrderColumn(): void
    {
        if (!Schema::hasTable('chapters')) {
            return;
        }

        if (!Schema::hasColumn('chapters', 'order_index') && Schema::hasColumn('chapters', 'order')) {
            DB::statement('ALTER TABLE chapters RENAME COLUMN "order" TO order_index');
        }

        if (!Schema::hasColumn('chapters', 'order_index')) {
            Schema::table('chapters', function (Blueprint $table) {
                $table->unsignedInteger('order_index')->default(0);
            });
        }
    }

    private function fixBlocksColumns(): void
    {
        if (!Schema::hasTable('blocks')) {
            return;
        }

        if (!Schema::hasColumn('blocks', 'order_index') && Schema::hasColumn('blocks', 'order')) {
            DB::statement('ALTER TABLE blocks RENAME COLUMN "order" TO order_index');
        }

        if (!Schema::hasColumn('blocks', 'order_index')) {
            Schema::table('blocks', function (Blueprint $table) {
                $table->unsignedInteger('order_index')->default(0);
            });
        }

        if (!Schema::hasColumn('blocks', 'difficulty')) {
            Schema::table('blocks', function (Blueprint $table) {
                $table->unsignedInteger('difficulty')->nullable();
            });
        }
    }
};
