<?php

namespace App\Domain\Admin\Actions;

use App\Models\User;

class BanUserAction
{
    public function __construct(
        private readonly RevokeUserTokensAction $revokeUserTokensAction,
    ) {
    }

    public function execute(User $target): void
    {
        $target->status = User::STATUS_BANNED;
        $target->save();
        $this->revokeUserTokensAction->execute($target);
    }
}
