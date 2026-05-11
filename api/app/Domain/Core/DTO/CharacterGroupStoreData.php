<?php

namespace App\Domain\Core\DTO;

final readonly class CharacterGroupStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
