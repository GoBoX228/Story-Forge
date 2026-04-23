<?php

namespace App\Domain\Core\DTO;

final readonly class BlockReorderData
{
    public function __construct(
        public int $orderIndex,
    ) {
    }
}
