<?php

namespace App\Domain\Auth\DTO;

final readonly class ResendTwoFactorData
{
    public function __construct(
        public string $challengeToken,
    ) {
    }
}
