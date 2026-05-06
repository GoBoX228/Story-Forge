<?php

namespace App\Domain\Core\Services;

use App\Models\Faction;

class FactionService extends WorldEntityService
{
    protected function modelClass(): string
    {
        return Faction::class;
    }

    protected function searchColumn(): string
    {
        return 'name';
    }
}
