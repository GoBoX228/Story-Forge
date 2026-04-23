<?php

namespace App\Domain\Core\DTO;

final readonly class ChapterUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
