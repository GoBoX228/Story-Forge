<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Core\Actions\DeleteModelAction;
use Illuminate\Database\Eloquent\Model;

class DeleteContentModelAction
{
    public function __construct(
        private readonly DeleteModelAction $deleteModelAction,
    ) {
    }

    public function execute(Model $model): void
    {
        $this->deleteModelAction->execute($model);
    }
}
