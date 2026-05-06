<?php

namespace App\Domain\Core\Services;

use App\Models\Location;

class LocationService extends WorldEntityService
{
    protected function modelClass(): string
    {
        return Location::class;
    }

    protected function searchColumn(): string
    {
        return 'name';
    }
}
