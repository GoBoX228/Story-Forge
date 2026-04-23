<?php

namespace App\Domain\Admin\Actions;

use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use Illuminate\Database\Eloquent\Model;

class ResolveContentModelAction
{
    public function execute(string $type, int $id): ?Model
    {
        return match ($type) {
            Report::TARGET_SCENARIO => Scenario::query()->find($id),
            Report::TARGET_MAP => Map::query()->find($id),
            Report::TARGET_CHARACTER => Character::query()->find($id),
            Report::TARGET_ITEM => Item::query()->find($id),
            Report::TARGET_CAMPAIGN => Campaign::query()->find($id),
            default => null,
        };
    }
}
