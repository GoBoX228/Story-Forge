<?php

namespace App\Domain\Core\DTO;

final readonly class AssetIndexData
{
    public function __construct(
        public ?string $type,
        public ?string $kind,
        public mixed $folderId,
        public mixed $collectionId,
        public ?string $search,
    ) {
    }
}
