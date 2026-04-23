<?php

namespace App\Domain\Core\DTO;

final readonly class BlockUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
