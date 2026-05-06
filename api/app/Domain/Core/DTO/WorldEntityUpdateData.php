<?php

namespace App\Domain\Core\DTO;

final readonly class WorldEntityUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
