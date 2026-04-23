<?php

namespace App\Domain\Auth\DTO;

use App\Models\User;
use Symfony\Component\HttpFoundation\Cookie;

final readonly class IssuedTokensData
{
    public function __construct(
        public string $accessToken,
        public string $tokenType,
        public int $expiresIn,
        public User $user,
        public Cookie $refreshCookie,
    ) {
    }
}
