<?php

namespace App\Domain\Core\Actions;

use Illuminate\Database\Eloquent\Model;

class CreateModelAction
{
    public function execute(string $modelClass, array $payload): Model
    {
        return $modelClass::query()->create($payload);
    }
}
