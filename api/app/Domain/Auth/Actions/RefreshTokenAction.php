<?php

namespace App\Domain\Auth\Actions;

use App\Models\RefreshToken;
use App\Models\User;

class RefreshTokenAction
{
    public function resolve(string $plainToken): ?RefreshToken
    {
        $record = RefreshToken::query()
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if (!$record) {
            return null;
        }

        if ($record->expires_at->isPast()) {
            $record->delete();
            return null;
        }

        return $record;
    }

    public function revokeForUser(User $user): void
    {
        RefreshToken::query()->where('user_id', $user->id)->delete();
    }
}
