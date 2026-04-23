<?php

namespace App\Domain\Core\DTO;

final readonly class ItemStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
