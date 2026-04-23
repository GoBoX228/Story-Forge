<?php

namespace App\Domain\Broadcast\Actions;

use App\Models\Announcement;
use Illuminate\Support\Collection;

class FetchBroadcastsAction
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

