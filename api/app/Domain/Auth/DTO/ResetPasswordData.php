<?php

namespace App\Domain\Auth\DTO;

final readonly class ResetPasswordData
{
    public function __construct(
        public string $email,
        public string $token,
        public string $password,
    ) {
    }
}
