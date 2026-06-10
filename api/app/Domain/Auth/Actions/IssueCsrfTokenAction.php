<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\Support\AuthConfig;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

class IssueCsrfTokenAction
{
    public const COOKIE_NAME = 'csrf_token_signature';
    public const HEADER_NAME = 'X-CSRF-TOKEN';

    public function execute(): array
    {
        $token = Str::random(64);
        $ttl = AuthConfig::csrfTokenTtlMinutes();

        return [
            'token' => $token,
            'cookie' => cookie(
                self::COOKIE_NAME,
                $this->signature($token),
                $ttl,
                '/',
                null,
                app()->environment('production'),
                true,
                false,
                'Lax'
            ),
        ];
    }

    public function isValid(?string $token, ?string $signature): bool
    {
        if (!$token || !$signature) {
            return false;
        }

        return hash_equals($this->signature($token), $signature);
    }

    public function forgetCookie(): Cookie
    {
        return cookie(self::COOKIE_NAME, '', -1, '/', null, app()->environment('production'), true, false, 'Lax');
    }

    private function signature(string $token): string
    {
        return hash_hmac('sha256', $token, config('app.key'));
    }
}
