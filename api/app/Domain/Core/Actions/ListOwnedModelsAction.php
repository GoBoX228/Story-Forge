<?php

namespace App\Domain\Core\Actions;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ListOwnedModelsAction
{
    /**
     * @param  callable(Builder):void|null  $scope
     */
    public function execute(string $modelClass, int $userId, ?callable $scope = null): Collection
    {
        $query = $modelClass::query()->where('user_id', $userId);

        if ($scope !== null) {
            $scope($query);
        }

        return $query->orderByDesc('updated_at')->get();
    }
}
