<?php

namespace App\Domain\Core\DTO;

final readonly class AssetIndexData
{
    public function __construct(
        public ?string $type,
        public mixed $campaignId,
    ) {
    }
}
