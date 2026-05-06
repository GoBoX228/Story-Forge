<?php

namespace App\Domain\Core\DTO;

final readonly class TagAssignmentData
{
    public function __construct(
        public array $tagIds,
        public array $newTags,
    ) {
    }
}
