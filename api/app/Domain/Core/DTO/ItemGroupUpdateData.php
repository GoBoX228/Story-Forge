<?php

namespace App\Domain\Core\DTO;

final readonly class ItemGroupUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
