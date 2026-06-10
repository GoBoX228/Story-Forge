<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\DTO\IssuedTokensData;
use App\Domain\Auth\Support\AuthConfig;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Str;

class IssueTokensAction
{
    public function execute(User $user): IssuedTokensData
    {
        $refreshTtl = AuthConfig::refreshTokenTtlMinutes();

        $refreshPlain = Str::random(64);
        RefreshToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $refreshPlain),
            'expires_at' => now()->addMinutes($refreshTtl),
        ]);

        $cookie = cookie(
            'refresh_token',
            $refreshPlain,
            $refreshTtl,
            '/',
            null,
            app()->environment('production'),
            true,
            false,
            'Lax'
        );

        return new IssuedTokensData(
            $user,
            $cookie
        );
    }
}
