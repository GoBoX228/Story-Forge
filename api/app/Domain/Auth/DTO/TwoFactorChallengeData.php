<?php

namespace App\Domain\Auth\DTO;

final readonly class TwoFactorChallengeData
{
    public function __construct(
        public string $challengeToken,
        public int $expiresIn,
        public int $retryAfter,
        public string $delivery,
        public ?string $devCode,
    ) {
    }
}
