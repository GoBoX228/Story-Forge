<?php

namespace App\Domain\Admin\Actions;

use App\Models\RefreshToken;
use App\Models\User;

class RevokeUserTokensAction
{
    public function execute(User $user): void
    {
        $user->tokens()->delete();
        RefreshToken::query()->where('user_id', $user->id)->delete();
    }
}
