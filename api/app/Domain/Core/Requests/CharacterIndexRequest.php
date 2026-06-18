<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CharacterIndexData;

class CharacterIndexRequest extends CoreReadRequest
{
    public function toDto(): CharacterIndexData
    {
        $scenarioKey = $this->has('scenario_id') ? 'scenario_id' : 'scenarioId';

        return new CharacterIndexData(
            $this->filled($scenarioKey),
            $this->input($scenarioKey),
            $this->has('groupId'),
            $this->input('groupId'),
            $this->filled('q'),
            (string) $this->input('q', '')
        );
    }
}
