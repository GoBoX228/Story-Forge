<?php

namespace App\Domain\Auth\Support;

class AuthConfig
{
    public const TWO_FACTOR_TTL_MINUTES = 10;
    public const TWO_FACTOR_MAX_ATTEMPTS = 5;
    public const TWO_FACTOR_RESEND_COOLDOWN_SECONDS = 30;
    public const TWO_FACTOR_RECOVERY_CODES_COUNT = 8;

    public const LOGIN_MAX_FAILED_ATTEMPTS = 5;
    public const LOGIN_LOCK_MINUTES = 15;

    public static function accessTokenTtlMinutes(): int
    {
        return (int) config('tokens.access_ttl_minutes', 15);
    }

    public static function refreshTokenTtlMinutes(): int
    {
        return (int) config('tokens.refresh_ttl_minutes', 43200);
    }

    public static function passwordResetTtlMinutes(): int
    {
        return max(1, (int) config('auth.passwords.users.expire', 60));
    }
}
