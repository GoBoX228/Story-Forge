<?php

namespace App\Domain\Core\DTO;

final readonly class AssetCollectionUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
