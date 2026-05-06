<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioNodeStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
