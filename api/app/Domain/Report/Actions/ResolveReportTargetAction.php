<?php

namespace App\Domain\Report\Actions;

use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ResolveReportTargetAction
{
    public function execute(string $targetType, int $targetId): ?Model
    {
        return match ($targetType) {
            Report::TARGET_USER => User::query()->find($targetId),
            Report::TARGET_SCENARIO => Scenario::query()->find($targetId),
            Report::TARGET_MAP => Map::query()->find($targetId),
            Report::TARGET_CHARACTER => Character::query()->find($targetId),
            Report::TARGET_ITEM => Item::query()->find($targetId),
            Report::TARGET_CAMPAIGN => Campaign::query()->find($targetId),
            default => null,
        };
    }
}

