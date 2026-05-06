<?php

namespace App\Domain\Core\DTO;

final readonly class ScenarioNodeEntityLinkStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
