<?php

namespace App\Domain\Core\DTO;

final readonly class CharacterIndexData
{
    public function __construct(
        public bool $hasScenarioId,
        public mixed $scenarioId,
        public bool $hasSearch,
        public string $search,
    ) {
    }
}
