<?php

namespace App\Domain\Auth\Policies;

use App\Models\User;

class UserAuthPolicy
{
    public function viewMe(User $actor, User $subject): bool
    {
        return $actor->id === $subject->id;
    }

    public function updateMe(User $actor, User $subject): bool
    {
        return $actor->id === $subject->id;
    }

    public function changePassword(User $actor, User $subject): bool
    {
        return $actor->id === $subject->id;
    }

    public function manageTwoFactor(User $actor, User $subject): bool
    {
        return $actor->id === $subject->id;
    }
}
