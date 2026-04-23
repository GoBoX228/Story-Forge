<?php

namespace App\Domain\Auth\DTO;

final readonly class ConfirmTwoFactorData
{
    public function __construct(
        public string $challengeToken,
        public string $code,
    ) {
    }
}
