<?php

namespace App\Domain\Core\DTO;

final readonly class BlockStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
