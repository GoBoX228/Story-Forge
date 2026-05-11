<?php

namespace App\Domain\Core\DTO;

final readonly class AssetCollectionAssignmentData
{
    /**
     * @param array<int, int|string> $collectionIds
     */
    public function __construct(
        public array $collectionIds,
    ) {
    }
}
