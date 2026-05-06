<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioNodeUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
