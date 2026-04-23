<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->migrateOwnerToUser('scenarios');
        $this->migrateOwnerToUser('maps');
        $this->migrateOwnerToUser('characters');
    }

    public function down(): void
    {
    }

    private function migrateOwnerToUser(string $table): void
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'owner_id')) {
            return;
        }

        if (!Schema::hasColumn($table, 'user_id')) {
            Schema::table($table, function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            });
        }

        DB::table($table)
            ->whereNull('user_id')
            ->update(['user_id' => DB::raw('owner_id')]);

        Schema::table($table, function (Blueprint $table) {
            $table->dropConstrainedForeignId('owner_id');
        });
    }
};
