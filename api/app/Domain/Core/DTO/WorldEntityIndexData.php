<?php

namespace App\Domain\Core\DTO;

final readonly class WorldEntityIndexData
{
    public function __construct(
        public mixed $campaignId,
        public ?string $search,
    ) {
    }
}
