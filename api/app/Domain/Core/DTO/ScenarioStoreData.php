<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
