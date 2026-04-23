<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Admin\Support\AdminConfig;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BuildAdminContentItemsAction
{
    public function execute(string $type, string $search): Collection
    {
        $reportStats = Report::query()
            ->select('target_type', 'target_id', DB::raw('COUNT(*) as total'), DB::raw("SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_total"))
            ->groupBy('target_type', 'target_id')
            ->get()
            ->keyBy(fn ($row) => "{$row->target_type}:{$row->target_id}");

        $items = collect();

        if ($type === '' || $type === Report::TARGET_SCENARIO) {
            $items = $items->concat(
                Scenario::query()->with('user:id,name,email')->latest('updated_at')->limit(AdminConfig::CONTENT_PER_TYPE_LIMIT)->get()->map(function (Scenario $scenario) use ($reportStats) {
                    $key = Report::TARGET_SCENARIO . ':' . $scenario->id;
                    $stats = $reportStats->get($key);
                    return [
                        'type' => Report::TARGET_SCENARIO,
                        'id' => $scenario->id,
                        'title' => $scenario->title,
                        'author' => $scenario->user?->name ?? 'unknown',
                        'author_id' => $scenario->user_id,
                        'reports_total' => (int) ($stats->total ?? 0),
                        'reports_open' => (int) ($stats->open_total ?? 0),
                        'created_at' => $scenario->created_at,
                        'updated_at' => $scenario->updated_at,
                    ];
                })
            );
        }

        if ($type === '' || $type === Report::TARGET_MAP) {
            $items = $items->concat(
                Map::query()->with('user:id,name,email')->latest('updated_at')->limit(AdminConfig::CONTENT_PER_TYPE_LIMIT)->get()->map(function (Map $map) use ($reportStats) {
                    $key = Report::TARGET_MAP . ':' . $map->id;
                    $stats = $reportStats->get($key);
                    return [
                        'type' => Report::TARGET_MAP,
                        'id' => $map->id,
                        'title' => $map->name,
                        'author' => $map->user?->name ?? 'unknown',
                        'author_id' => $map->user_id,
                        'reports_total' => (int) ($stats->total ?? 0),
                        'reports_open' => (int) ($stats->open_total ?? 0),
                        'created_at' => $map->created_at,
                        'updated_at' => $map->updated_at,
                    ];
                })
            );
        }

        if ($type === '' || $type === Report::TARGET_CHARACTER) {
            $items = $items->concat(
                Character::query()->with('user:id,name,email')->latest('updated_at')->limit(AdminConfig::CONTENT_PER_TYPE_LIMIT)->get()->map(function (Character $character) use ($reportStats) {
                    $key = Report::TARGET_CHARACTER . ':' . $character->id;
                    $stats = $reportStats->get($key);
                    return [
                        'type' => Report::TARGET_CHARACTER,
                        'id' => $character->id,
                        'title' => $character->name,
                        'author' => $character->user?->name ?? 'unknown',
                        'author_id' => $character->user_id,
                        'reports_total' => (int) ($stats->total ?? 0),
                        'reports_open' => (int) ($stats->open_total ?? 0),
                        'created_at' => $character->created_at,
                        'updated_at' => $character->updated_at,
                    ];
                })
            );
        }

        if ($type === '' || $type === Report::TARGET_ITEM) {
            $items = $items->concat(
                Item::query()->with('user:id,name,email')->latest('updated_at')->limit(AdminConfig::CONTENT_PER_TYPE_LIMIT)->get()->map(function (Item $item) use ($reportStats) {
                    $key = Report::TARGET_ITEM . ':' . $item->id;
                    $stats = $reportStats->get($key);
                    return [
                        'type' => Report::TARGET_ITEM,
                        'id' => $item->id,
                        'title' => $item->name,
                        'author' => $item->user?->name ?? 'unknown',
                        'author_id' => $item->user_id,
                        'reports_total' => (int) ($stats->total ?? 0),
                        'reports_open' => (int) ($stats->open_total ?? 0),
                        'created_at' => $item->created_at,
                        'updated_at' => $item->updated_at,
                    ];
                })
            );
        }

        if ($type === '' || $type === Report::TARGET_CAMPAIGN) {
            $items = $items->concat(
                Campaign::query()->with('user:id,name,email')->latest('updated_at')->limit(AdminConfig::CONTENT_PER_TYPE_LIMIT)->get()->map(function (Campaign $campaign) use ($reportStats) {
                    $key = Report::TARGET_CAMPAIGN . ':' . $campaign->id;
                    $stats = $reportStats->get($key);
                    return [
                        'type' => Report::TARGET_CAMPAIGN,
                        'id' => $campaign->id,
                        'title' => $campaign->title,
                        'author' => $campaign->user?->name ?? 'unknown',
                        'author_id' => $campaign->user_id,
                        'reports_total' => (int) ($stats->total ?? 0),
                        'reports_open' => (int) ($stats->open_total ?? 0),
                        'created_at' => $campaign->created_at,
                        'updated_at' => $campaign->updated_at,
                    ];
                })
            );
        }

        if ($search !== '') {
            $items = $items->filter(function (array $item) use ($search) {
                return str_contains(mb_strtolower((string) $item['title']), $search)
                    || str_contains(mb_strtolower((string) $item['author']), $search);
            });
        }

        return $items
            ->sortByDesc(fn (array $item) => strtotime((string) ($item['updated_at'] ?? $item['created_at'])))
            ->values();
    }
}
