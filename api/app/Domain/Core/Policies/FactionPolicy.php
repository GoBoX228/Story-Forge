<?php

namespace App\Domain\Core\Policies;

use App\Models\User;

class FactionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, mixed $faction = null): bool
    {
        return true;
    }

    public function update(User $user, mixed $faction = null): bool
    {
        return true;
    }

    public function delete(User $user, mixed $faction = null): bool
    {
        return true;
    }
}
