<?php

namespace App\Domain\Core\DTO;

final readonly class MapUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
