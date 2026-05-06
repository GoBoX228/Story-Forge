<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioTransitionUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
