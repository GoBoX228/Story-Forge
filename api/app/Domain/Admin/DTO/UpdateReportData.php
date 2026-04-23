<?php

namespace App\Domain\Admin\DTO;

final readonly class UpdateReportData
{
    public function __construct(
        public bool $hasStatus,
        public ?string $status,
        public bool $banTargetUser,
    ) {
    }
}
