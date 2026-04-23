<?php

namespace App\Domain\Export\Actions;

use App\Models\Map;
use Illuminate\Support\Collection;

class FetchOwnedScenarioMapsAction
{
    public function execute(int $userId, int $scenarioId): Collection
    {
        return Map::query()
            ->where('user_id', $userId)
            ->where('scenario_id', $scenarioId)
            ->get();
    }
}

