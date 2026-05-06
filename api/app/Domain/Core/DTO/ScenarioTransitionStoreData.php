<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioTransitionStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
