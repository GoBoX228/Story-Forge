<?php

namespace App\Domain\Core\Actions;

use App\Models\Asset;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\WorldEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class DeleteModelAction
{
    public function execute(Model $model): void
    {
        DB::transaction(function () use ($model): void {
            $entityType = $this->entityType($model);

            if ($entityType !== null) {
                EntityLink::query()
                    ->where(function ($query) use ($entityType, $model): void {
                        $query
                            ->where('source_type', $entityType)
                            ->where('source_id', $model->getKey());
                    })
                    ->orWhere(function ($query) use ($entityType, $model): void {
                        $query
                            ->where('target_type', $entityType)
                            ->where('target_id', $model->getKey());
                    })
                    ->delete();
            }

            if ($model instanceof Scenario) {
                $nodeIds = ScenarioNode::query()
                    ->where('scenario_id', $model->getKey())
                    ->pluck('id');

                if ($nodeIds->isNotEmpty()) {
                    EntityLink::query()
                        ->where('source_type', EntityLink::SOURCE_SCENARIO_NODE)
                        ->whereIn('source_id', $nodeIds)
                        ->delete();
                }
            }

            $model->delete();
        });
    }

    private function entityType(Model $model): ?string
    {
        return match (true) {
            $model instanceof Scenario => EntityLink::TARGET_SCENARIO,
            $model instanceof Map => EntityLink::TARGET_MAP,
            $model instanceof Character => EntityLink::TARGET_CHARACTER,
            $model instanceof Item => EntityLink::TARGET_ITEM,
            $model instanceof Asset => EntityLink::TARGET_ASSET,
            $model instanceof Location => EntityLink::TARGET_LOCATION,
            $model instanceof Faction => EntityLink::TARGET_FACTION,
            $model instanceof WorldEvent => EntityLink::TARGET_EVENT,
            $model instanceof ScenarioNode => EntityLink::SOURCE_SCENARIO_NODE,
            default => null,
        };
    }
}
