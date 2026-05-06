<?php

namespace App\Domain\Core\DTO;

final readonly class EntityLinkUpdateData
{
    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        public array $data,
    ) {
    }
}
