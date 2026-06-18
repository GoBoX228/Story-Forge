<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioGroupUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}

