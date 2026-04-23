<?php

namespace App\Domain\Core\DTO;

final readonly class MapIndexData
{
    public function __construct(
        public bool $hasScenarioId,
        public mixed $scenarioId,
    ) {
    }
}
