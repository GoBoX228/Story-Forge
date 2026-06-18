<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $this->migrateCampaignOwnedMaterials('maps', 'map', $now);
        $this->migrateCampaignOwnedMaterials('characters', 'character', $now);
        $this->migrateCampaignResources($now);
        $this->migrateCampaignTags();

        if (Schema::hasColumn('maps', 'campaign_id')) {
            Schema::table('maps', function (Blueprint $table): void {
                $table->dropIndex(['campaign_id', 'updated_at']);
                $table->dropConstrainedForeignId('campaign_id');
            });
        }

        if (Schema::hasColumn('characters', 'campaign_id')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->dropIndex(['campaign_id', 'updated_at']);
                $table->dropConstrainedForeignId('campaign_id');
            });
        }

        Schema::table('campaigns', function (Blueprint $table): void {
            $columns = collect(['tags', 'resources', 'progress', 'last_played'])
                ->filter(fn (string $column): bool => Schema::hasColumn('campaigns', $column))
                ->all();

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table): void {
            if (!Schema::hasColumn('campaigns', 'tags')) {
                $table->jsonb('tags')->nullable();
            }
            if (!Schema::hasColumn('campaigns', 'resources')) {
                $table->jsonb('resources')->nullable();
            }
            if (!Schema::hasColumn('campaigns', 'progress')) {
                $table->unsignedTinyInteger('progress')->default(0);
            }
            if (!Schema::hasColumn('campaigns', 'last_played')) {
                $table->date('last_played')->nullable();
            }
        });

        if (!Schema::hasColumn('maps', 'campaign_id')) {
            Schema::table('maps', function (Blueprint $table): void {
                $table->foreignId('campaign_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained()
                    ->nullOnDelete();
                $table->index(['campaign_id', 'updated_at']);
            });
        }

        if (!Schema::hasColumn('characters', 'campaign_id')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->foreignId('campaign_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained()
                    ->nullOnDelete();
                $table->index(['campaign_id', 'updated_at']);
            });
        }

        $campaigns = DB::table('campaigns')->get(['id']);
        foreach ($campaigns as $campaign) {
            $this->restoreOwnedMaterialCampaign('maps', 'map', (int) $campaign->id);
            $this->restoreOwnedMaterialCampaign('characters', 'character', (int) $campaign->id);

            $resourceNames = DB::table('entity_links')
                ->join('items', function ($join): void {
                    $join->on('items.id', '=', 'entity_links.target_id')
                        ->where('entity_links.target_type', '=', 'item');
                })
                ->where('entity_links.source_type', 'campaign')
                ->where('entity_links.source_id', $campaign->id)
                ->where('entity_links.relation_type', 'uses')
                ->orderBy('entity_links.id')
                ->pluck('items.name')
                ->values()
                ->all();

            $tagNames = DB::table('taggables')
                ->join('tags', 'tags.id', '=', 'taggables.tag_id')
                ->where('taggables.taggable_type', 'campaign')
                ->where('taggables.taggable_id', $campaign->id)
                ->orderBy('tags.name')
                ->pluck('tags.name')
                ->values()
                ->all();

            DB::table('campaigns')->where('id', $campaign->id)->update([
                'resources' => json_encode($resourceNames, JSON_UNESCAPED_UNICODE),
                'tags' => json_encode($tagNames, JSON_UNESCAPED_UNICODE),
            ]);
        }

        DB::table('taggables')->where('taggable_type', 'campaign')->delete();
        DB::table('entity_links')->where('source_type', 'campaign')->delete();
    }

    private function migrateCampaignOwnedMaterials(string $table, string $targetType, mixed $now): void
    {
        if (!Schema::hasColumn($table, 'campaign_id')) {
            return;
        }

        DB::table($table)
            ->whereNotNull('campaign_id')
            ->orderBy('id')
            ->get(['id', 'campaign_id'])
            ->each(function (object $material) use ($targetType, $now): void {
                $this->insertCampaignUse(
                    campaignId: (int) $material->campaign_id,
                    targetType: $targetType,
                    targetId: (int) $material->id,
                    now: $now
                );
            });
    }

    private function migrateCampaignResources(mixed $now): void
    {
        if (!Schema::hasColumn('campaigns', 'resources')) {
            return;
        }

        DB::table('campaigns')
            ->orderBy('id')
            ->get(['id', 'user_id', 'resources'])
            ->each(function (object $campaign) use ($now): void {
                foreach ($this->jsonStringList($campaign->resources) as $name) {
                    $item = DB::table('items')
                        ->where('user_id', $campaign->user_id)
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                        ->orderBy('id')
                        ->first(['id']);

                    $itemId = $item?->id;
                    if ($itemId === null) {
                        $itemId = DB::table('items')->insertGetId([
                            'user_id' => $campaign->user_id,
                            'item_group_id' => null,
                            'name' => $name,
                            'type' => 'Прочее',
                            'rarity' => 'Обычный',
                            'description' => null,
                            'modifiers' => json_encode([], JSON_UNESCAPED_UNICODE),
                            'weight' => 0,
                            'value' => 0,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }

                    $this->insertCampaignUse(
                        campaignId: (int) $campaign->id,
                        targetType: 'item',
                        targetId: (int) $itemId,
                        now: $now
                    );
                }
            });
    }

    private function migrateCampaignTags(): void
    {
        if (!Schema::hasColumn('campaigns', 'tags')) {
            return;
        }

        DB::table('campaigns')
            ->orderBy('id')
            ->get(['id', 'user_id', 'tags'])
            ->each(function (object $campaign): void {
                foreach ($this->jsonStringList($campaign->tags) as $name) {
                    $slug = Str::slug(mb_strtolower($name));
                    if ($slug === '') {
                        $slug = 'tag-' . substr(sha1($name), 0, 12);
                    }

                    $tag = DB::table('tags')
                        ->where('user_id', $campaign->user_id)
                        ->where('slug', $slug)
                        ->first(['id']);

                    $tagId = $tag?->id ?? DB::table('tags')->insertGetId([
                        'user_id' => $campaign->user_id,
                        'name' => $name,
                        'slug' => $slug,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('taggables')->insertOrIgnore([
                        'tag_id' => $tagId,
                        'taggable_type' => 'campaign',
                        'taggable_id' => $campaign->id,
                    ]);
                }
            });
    }

    private function insertCampaignUse(int $campaignId, string $targetType, int $targetId, mixed $now): void
    {
        $exists = DB::table('entity_links')
            ->where('source_type', 'campaign')
            ->where('source_id', $campaignId)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->where('relation_type', 'uses')
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('entity_links')->insert([
            'source_type' => 'campaign',
            'source_id' => $campaignId,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'relation_type' => 'uses',
            'label' => null,
            'metadata' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function restoreOwnedMaterialCampaign(string $table, string $targetType, int $campaignId): void
    {
        $ids = DB::table('entity_links')
            ->where('source_type', 'campaign')
            ->where('source_id', $campaignId)
            ->where('target_type', $targetType)
            ->where('relation_type', 'uses')
            ->pluck('target_id')
            ->all();

        if ($ids !== []) {
            DB::table($table)
                ->whereIn('id', $ids)
                ->whereNull('campaign_id')
                ->update(['campaign_id' => $campaignId]);
        }
    }

    /**
     * @return array<int, string>
     */
    private function jsonStringList(mixed $value): array
    {
        $decoded = is_string($value) ? json_decode($value, true) : $value;

        return collect(is_array($decoded) ? $decoded : [])
            ->map(fn (mixed $entry): string => trim((string) $entry))
            ->filter()
            ->unique(fn (string $entry): string => mb_strtolower($entry))
            ->values()
            ->all();
    }
};
