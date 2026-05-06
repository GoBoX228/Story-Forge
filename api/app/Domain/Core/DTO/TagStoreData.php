<?php

namespace App\Domain\Core\DTO;

final readonly class TagStoreData
{
    public function __construct(
        public string $name,
    ) {
    }
}
