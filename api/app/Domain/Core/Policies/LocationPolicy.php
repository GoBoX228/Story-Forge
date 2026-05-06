<?php

namespace App\Domain\Core\Policies;

use App\Models\User;

class LocationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, mixed $location = null): bool
    {
        return true;
    }

    public function update(User $user, mixed $location = null): bool
    {
        return true;
    }

    public function delete(User $user, mixed $location = null): bool
    {
        return true;
    }
}
