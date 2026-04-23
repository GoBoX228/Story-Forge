<?php

namespace App\Domain\Core\DTO;

final readonly class MapStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
