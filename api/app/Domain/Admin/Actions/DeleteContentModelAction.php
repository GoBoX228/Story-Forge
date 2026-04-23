<?php

namespace App\Domain\Admin\Actions;

use Illuminate\Database\Eloquent\Model;

class DeleteContentModelAction
{
    public function execute(Model $model): void
    {
        $model->delete();
    }
}
