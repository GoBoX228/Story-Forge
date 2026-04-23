<?php

namespace App\Domain\Admin\DTO;

final readonly class DeleteContentData
{
    public function __construct(
        public string $type,
        public int $entityId,
    ) {
    }
}
