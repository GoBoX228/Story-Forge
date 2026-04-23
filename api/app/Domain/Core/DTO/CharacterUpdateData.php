<?php

namespace App\Domain\Core\DTO;

final readonly class CharacterUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
