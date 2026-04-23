<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
