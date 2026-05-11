<?php

namespace App\Domain\Core\DTO;

final readonly class AssetFolderStoreData
{
    public function __construct(
        public string $name,
    ) {
    }
}
