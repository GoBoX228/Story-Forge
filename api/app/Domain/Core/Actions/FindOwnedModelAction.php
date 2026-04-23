<?php

namespace App\Domain\Core\Actions;

use Illuminate\Database\Eloquent\Model;

class FindOwnedModelAction
{
    public function execute(string $modelClass, int $userId, string|int $id): Model
    {
        return $modelClass::query()
            ->where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();
    }
}
