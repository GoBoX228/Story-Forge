<?php

namespace App\Domain\Auth\DTO;

final readonly class RegisterData
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
    ) {
    }
}
