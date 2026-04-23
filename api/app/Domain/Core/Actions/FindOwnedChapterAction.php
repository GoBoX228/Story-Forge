<?php

namespace App\Domain\Core\Actions;

use App\Models\Chapter;

class FindOwnedChapterAction
{
    public function execute(int $userId, string|int $id): Chapter
    {
        return Chapter::query()
            ->where('id', $id)
            ->whereHas('scenario', fn ($q) => $q->where('user_id', $userId))
            ->firstOrFail();
    }
}
