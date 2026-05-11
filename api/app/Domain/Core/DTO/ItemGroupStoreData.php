<?php

namespace App\Domain\Core\DTO;

final readonly class ItemGroupStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
