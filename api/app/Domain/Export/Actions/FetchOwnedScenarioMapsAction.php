<?php

namespace App\Domain\Export\Actions;

use App\Models\EntityLink;
use App\Models\Map;
use Illuminate\Support\Collection;

class FetchOwnedScenarioMapsAction
{
    public function execute(int $userId, int $scenarioId): Collection
    {
        return Map::query()
            ->where('user_id', $userId)
            ->whereExists(function ($query) use ($scenarioId): void {
                $query
                    ->selectRaw('1')
                    ->from('entity_links')
                    ->where('source_type', EntityLink::TARGET_SCENARIO)
                    ->where('source_id', $scenarioId)
                    ->where('target_type', EntityLink::TARGET_MAP)
                    ->where('relation_type', EntityLink::RELATION_USES)
                    ->whereColumn('target_id', 'maps.id');
            })
            ->get();
    }
}
