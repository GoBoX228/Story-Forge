<?php

namespace App\Domain\Admin\DTO;

final readonly class ListReportsData
{
    public function __construct(
        public string $status,
        public string $search,
    ) {
    }
}
