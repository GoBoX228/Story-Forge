<?php

namespace App\Domain\Core\DTO;

final readonly class AssetUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
