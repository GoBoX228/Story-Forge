<?php

namespace App\Domain\Admin\Actions;

use App\Models\User;

class PersistAdminUserChangesAction
{
    public function __construct(
        private readonly RevokeUserTokensAction $revokeUserTokensAction,
    ) {
    }

    public function execute(User $target, array $changes): void
    {
        if (empty($changes)) {
            return;
        }

        $target->fill($changes);
        $target->save();

        if (($changes['status'] ?? null) === User::STATUS_BANNED) {
            $this->revokeUserTokensAction->execute($target);
        }
    }
}
