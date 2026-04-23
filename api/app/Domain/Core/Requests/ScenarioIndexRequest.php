<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioIndexData;

class ScenarioIndexRequest extends CoreReadRequest
{
    public function toDto(): ScenarioIndexData
    {
        return new ScenarioIndexData();
    }
}
