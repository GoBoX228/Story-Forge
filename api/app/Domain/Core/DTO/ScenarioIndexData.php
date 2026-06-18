<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioIndexData
{
    public function __construct(
        public array $data = [],
    ) {
    }
}
