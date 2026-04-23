<?php

namespace App\Domain\Core\Actions;

use App\Models\Block;

class FindOwnedBlockAction
{
    public function execute(int $userId, string|int $id): Block
    {
        return Block::query()
            ->where('id', $id)
            ->whereHas('chapter.scenario', fn ($q) => $q->where('user_id', $userId))
            ->firstOrFail();
    }
}
