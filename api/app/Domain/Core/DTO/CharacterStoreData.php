<?php

namespace App\Domain\Core\DTO;

final readonly class CharacterStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
