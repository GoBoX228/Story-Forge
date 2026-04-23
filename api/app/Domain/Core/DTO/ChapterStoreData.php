<?php

namespace App\Domain\Core\DTO;

final readonly class ChapterStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
