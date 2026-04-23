<?php

namespace App\Domain\Core\Policies;

use App\Models\User;

class CharacterPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, mixed $character = null): bool
    {
        return true;
    }

    public function delete(User $user, mixed $character = null): bool
    {
        return true;
    }
}
