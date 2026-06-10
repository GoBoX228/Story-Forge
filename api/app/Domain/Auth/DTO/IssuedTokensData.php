<?php

namespace App\Domain\Auth\DTO;

use App\Models\User;
use Symfony\Component\HttpFoundation\Cookie;

final readonly class IssuedTokensData
{
    public function __construct(
        public User $user,
        public Cookie $refreshCookie,
    ) {
    }
}
