<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CharacterIndexData;

class CharacterIndexRequest extends CoreReadRequest
{
    public function toDto(): CharacterIndexData
    {
        return new CharacterIndexData(
            $this->filled('scenarioId'),
            $this->input('scenarioId'),
            $this->filled('q'),
            (string) $this->input('q', '')
        );
    }
}
