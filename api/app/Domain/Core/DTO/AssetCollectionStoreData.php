<?php

namespace App\Domain\Core\DTO;

final readonly class AssetCollectionStoreData
{
    public function __construct(
        public string $name,
        public ?string $description,
    ) {
    }
}
