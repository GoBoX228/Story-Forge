<?php

namespace App\Domain\Core\Services;

use App\Models\Chronicle;

class ChronicleService extends WorldEntityService
{
    protected function modelClass(): string
    {
        return Chronicle::class;
    }

    protected function searchColumn(): string
    {
        return 'title';
    }
}
