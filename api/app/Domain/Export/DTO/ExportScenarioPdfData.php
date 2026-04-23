<?php

namespace App\Domain\Export\DTO;

final readonly class ExportScenarioPdfData
{
    public function __construct(
        public string $scenarioId,
    ) {
    }
}

