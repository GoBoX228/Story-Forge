<?php

namespace App\Domain\Core\DTO;

final readonly class ItemUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
