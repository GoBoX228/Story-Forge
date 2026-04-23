<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addUserId('scenarios');
        $this->addUserId('maps');
        $this->addUserId('characters');
        $this->addUserId('refresh_tokens');

        $this->addScenarioId('maps');
        $this->addScenarioId('characters');
    }

    public function down(): void
    {
    }

    private function addUserId(string $table): void
    {
        if (!Schema::hasTable($table) || Schema::hasColumn($table, 'user_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
        });
    }

    private function addScenarioId(string $table): void
    {
        if (!Schema::hasTable($table) || Schema::hasColumn($table, 'scenario_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $table) {
            $table->foreignId('scenario_id')->nullable()->constrained()->nullOnDelete();
        });
    }
};
