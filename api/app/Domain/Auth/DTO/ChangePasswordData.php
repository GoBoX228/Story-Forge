<?php

namespace App\Domain\Auth\DTO;

final readonly class ChangePasswordData
{
    public function __construct(
        public string $currentPassword,
        public string $newPassword,
    ) {
    }
}
