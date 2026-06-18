<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioIndexData;

class ScenarioIndexRequest extends CoreReadRequest
{
    public function rules(): array
    {
        return [
            'groupId' => ['nullable'],
            'group_id' => ['nullable'],
        ];
    }

    public function toDto(): ScenarioIndexData
    {
        return new ScenarioIndexData($this->validated());
    }
}
