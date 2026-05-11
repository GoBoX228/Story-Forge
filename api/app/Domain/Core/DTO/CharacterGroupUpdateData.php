<?php

namespace App\Domain\Core\DTO;

final readonly class CharacterGroupUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
