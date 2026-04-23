<?php

namespace App\Domain\Broadcast\Policies;

use App\Models\User;

class BroadcastPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }
}

