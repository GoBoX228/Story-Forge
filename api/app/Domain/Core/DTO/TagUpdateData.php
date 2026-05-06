<?php

namespace App\Domain\Core\DTO;

final readonly class TagUpdateData
{
    public function __construct(
        public string $name,
    ) {
    }
}
