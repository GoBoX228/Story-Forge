<?php

namespace App\Domain\Core\Services;

use App\Models\WorldEvent;

class WorldEventService extends WorldEntityService
{
    protected function modelClass(): string
    {
        return WorldEvent::class;
    }

    protected function searchColumn(): string
    {
        return 'title';
    }
}
