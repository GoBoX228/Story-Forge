<?php

namespace App\Domain\Core\Actions;

use Illuminate\Database\Eloquent\Model;

class EnsureOwnedModelExistsAction
{
    public function execute(string $modelClass, int $userId, int|string|null $id): ?Model
    {
        if ($id === null || $id === '') {
            return null;
        }

        return $modelClass::query()
            ->where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();
    }
}
