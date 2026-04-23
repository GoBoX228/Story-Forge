<?php

namespace App\Domain\Core\Actions;

use Illuminate\Database\Eloquent\Model;

class DeleteModelAction
{
    public function execute(Model $model): void
    {
        $model->delete();
    }
}
