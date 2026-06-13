<?php

namespace App\Domain\Core\Policies;

use App\Models\User;

class ChroniclePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, mixed $chronicle = null): bool
    {
        return true;
    }

    public function update(User $user, mixed $chronicle = null): bool
    {
        return true;
    }

    public function delete(User $user, mixed $chronicle = null): bool
    {
        return true;
    }
}
