<?php

namespace App\Domain\Auth\DTO;

final readonly class VerifyTwoFactorData
{
    public function __construct(
        public string $challengeToken,
        public string $code,
    ) {
    }
}
