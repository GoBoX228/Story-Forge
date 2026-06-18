<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        if (Schema::hasTable('entity_links')) {
            if (Schema::hasColumn('maps', 'scenario_id')) {
                DB::table('maps')
                    ->whereNotNull('scenario_id')
                    ->orderBy('id')
                    ->get(['id', 'scenario_id'])
                    ->each(function (object $map) use ($now): void {
                        $this->insertScenarioUse((int) $map->scenario_id, 'map', (int) $map->id, $now);
                    });
            }

            if (Schema::hasColumn('characters', 'scenario_id')) {
                DB::table('characters')
                    ->whereNotNull('scenario_id')
                    ->orderBy('id')
                    ->get(['id', 'scenario_id'])
                    ->each(function (object $character) use ($now): void {
                        $this->insertScenarioUse((int) $character->scenario_id, 'character', (int) $character->id, $now);
                    });
            }

            DB::table('entity_links')
                ->where('source_type', 'map')
                ->where('target_type', 'scenario')
                ->where('relation_type', 'related')
                ->orderBy('id')
                ->get(['source_id', 'target_id'])
                ->each(function (object $link) use ($now): void {
                    $this->insertScenarioUse((int) $link->target_id, 'map', (int) $link->source_id, $now);
                });

            DB::table('entity_links')
                ->where('source_type', 'map')
                ->where('target_type', 'scenario')
                ->where('relation_type', 'related')
                ->delete();
        }

        if (Schema::hasColumn('maps', 'scenario_id')) {
            Schema::table('maps', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('scenario_id');
            });
        }

        if (Schema::hasColumn('characters', 'scenario_id')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('scenario_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('maps', 'scenario_id')) {
            Schema::table('maps', function (Blueprint $table): void {
                $table->foreignId('scenario_id')
                    ->nullable()
                    ->after('campaign_id')
                    ->constrained()
                    ->nullOnDelete();
                $table->index(['scenario_id', 'updated_at']);
            });
        }

        if (!Schema::hasColumn('characters', 'scenario_id')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->foreignId('scenario_id')
                    ->nullable()
                    ->after('campaign_id')
                    ->constrained()
                    ->nullOnDelete();
                $table->index(['scenario_id', 'updated_at']);
            });
        }

        if (!Schema::hasTable('entity_links')) {
            return;
        }

        DB::table('entity_links')
            ->where('source_type', 'scenario')
            ->where('target_type', 'map')
            ->where('relation_type', 'uses')
            ->orderBy('id')
            ->get(['source_id', 'target_id'])
            ->each(function (object $link): void {
                DB::table('maps')
                    ->where('id', $link->target_id)
                    ->whereNull('scenario_id')
                    ->update(['scenario_id' => $link->source_id]);
            });

        DB::table('entity_links')
            ->where('source_type', 'scenario')
            ->where('target_type', 'character')
            ->where('relation_type', 'uses')
            ->orderBy('id')
            ->get(['source_id', 'target_id'])
            ->each(function (object $link): void {
                DB::table('characters')
                    ->where('id', $link->target_id)
                    ->whereNull('scenario_id')
                    ->update(['scenario_id' => $link->source_id]);
            });
    }

    private function insertScenarioUse(int $scenarioId, string $targetType, int $targetId, mixed $now): void
    {
        $exists = DB::table('entity_links')
            ->where('source_type', 'scenario')
            ->where('source_id', $scenarioId)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->where('relation_type', 'uses')
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('entity_links')->insert([
            'source_type' => 'scenario',
            'source_id' => $scenarioId,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'relation_type' => 'uses',
            'label' => null,
            'metadata' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
};
