<?php

namespace App\Domain\Admin\Actions;

use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use App\Models\User;

class CountAdminStatsAction
{
    public function execute(): array
    {
        return [
            'users_total' => User::query()->count(),
            'users_active' => User::query()->where('status', User::STATUS_ACTIVE)->count(),
            'users_muted' => User::query()->where('status', User::STATUS_MUTED)->count(),
            'users_banned' => User::query()->where('status', User::STATUS_BANNED)->count(),
            'reports_open' => Report::query()->where('status', Report::STATUS_OPEN)->count(),
            'scenarios_total' => Scenario::query()->count(),
            'maps_total' => Map::query()->count(),
            'characters_total' => Character::query()->count(),
            'items_total' => Item::query()->count(),
            'campaigns_total' => Campaign::query()->count(),
        ];
    }
}
