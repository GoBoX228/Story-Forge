<?php

namespace App\Domain\Core\Actions;

use Illuminate\Database\Eloquent\Relations\HasMany;

class NextOrderIndexAction
{
    public function execute(HasMany $relation): int
    {
        return (($relation->max('order_index') ?? -1) + 1);
    }
}
