<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\MapIndexData;

class MapIndexRequest extends CoreReadRequest
{
    public function toDto(): MapIndexData
    {
        $scenarioKey = $this->has('scenario_id') ? 'scenario_id' : 'scenarioId';

        return new MapIndexData(
            $this->filled($scenarioKey),
            $this->input($scenarioKey)
        );
    }
}
