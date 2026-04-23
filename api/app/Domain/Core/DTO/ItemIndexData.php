<?php

namespace App\Domain\Core\DTO;

final readonly class ItemIndexData
{
    public function __construct(
        public bool $hasSearch,
        public string $search,
    ) {
    }
}
