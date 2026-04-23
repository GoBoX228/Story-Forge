<?php

namespace App\Domain\Core\Actions;

use Illuminate\Database\Eloquent\Model;

class UpdateModelAction
{
    public function execute(Model $model, array $payload): Model
    {
        $model->update($payload);

        return $model;
    }
}
