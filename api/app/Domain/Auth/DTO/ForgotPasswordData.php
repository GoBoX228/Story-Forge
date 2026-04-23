<?php

namespace App\Domain\Auth\DTO;

final readonly class ForgotPasswordData
{
    public function __construct(
        public string $email,
    ) {
    }
}
