<?php

namespace App\Domain\Admin\DTO;

final readonly class ListContentData
{
    public function __construct(
        public string $type,
        public string $search,
    ) {
    }
}
