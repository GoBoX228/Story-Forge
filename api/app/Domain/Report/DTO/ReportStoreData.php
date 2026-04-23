<?php

namespace App\Domain\Report\DTO;

final readonly class ReportStoreData
{
    public function __construct(
        public string $targetType,
        public int $targetId,
        public string $reason,
        public ?string $description,
    ) {
    }
}

