<?php

namespace App\Domain\Export\DTO;

final readonly class ExportScenarioCharacterCardsPdfData
{
    public function __construct(
        public string $scenarioId,
        public string $duplexEdge,
    ) {
    }
}

