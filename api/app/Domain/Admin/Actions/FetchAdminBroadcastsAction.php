<?php

namespace App\Domain\Admin\Actions;

use App\Models\Announcement;
use Illuminate\Support\Collection;

class FetchAdminBroadcastsAction
{
    public function execute(int $limit): Collection
    {
        return Announcement::query()
            ->with('user:id,name,email')
            ->latest()
            ->limit($limit)
            ->get();
    }
}
