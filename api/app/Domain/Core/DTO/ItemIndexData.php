<?php

namespace App\Domain\Core\DTO;

final readonly class ItemIndexData
{
    public function __construct(
        public bool $hasGroupId,
        public mixed $groupId,
        public bool $hasSearch,
        public string $search,
    ) {
    }
}
