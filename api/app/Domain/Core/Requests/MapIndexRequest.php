<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\MapIndexData;

class MapIndexRequest extends CoreReadRequest
{
    public function toDto(): MapIndexData
    {
        return new MapIndexData(
            $this->filled('scenarioId'),
            $this->input('scenarioId')
        );
    }
}
