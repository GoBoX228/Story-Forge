<?php

namespace App\Domain\Core\DTO;

final readonly class WorldEntityStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
