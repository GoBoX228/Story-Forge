<?php

namespace App\Domain\Admin\DTO;

final readonly class UpdateUserData
{
    public function __construct(
        public bool $hasRole,
        public ?string $role,
        public bool $hasStatus,
        public ?string $status,
    ) {
    }
}
