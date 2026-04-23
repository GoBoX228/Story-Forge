<?php

namespace App\Domain\Admin\Policies;

use App\Models\User;

class AdminModerationPolicy
{
    public function canRemoveOwnAdminRole(User $admin, User $target, ?string $role): bool
    {
        if ($role === null) {
            return true;
        }

        return !($admin->id === $target->id && $role !== User::ROLE_ADMIN);
    }

    public function canBanSelf(User $admin, User $target, ?string $status): bool
    {
        if ($status === null) {
            return true;
        }

        return !($admin->id === $target->id && $status === User::STATUS_BANNED);
    }

    public function canAutoBanReportTarget(User $admin, ?User $target): bool
    {
        return $target !== null && $target->id !== $admin->id;
    }
}
