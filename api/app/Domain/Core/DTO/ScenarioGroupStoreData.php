<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioGroupStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}

