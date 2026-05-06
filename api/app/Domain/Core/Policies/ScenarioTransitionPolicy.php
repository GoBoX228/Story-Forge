<?php

namespace App\Domain\Core\Policies;

use App\Models\User;

class ScenarioTransitionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, mixed $transition = null): bool
    {
        return true;
    }

    public function delete(User $user, mixed $transition = null): bool
    {
        return true;
    }
}
