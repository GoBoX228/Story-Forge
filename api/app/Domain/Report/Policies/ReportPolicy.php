<?php

namespace App\Domain\Report\Policies;

use App\Models\User;

class ReportPolicy
{
    public function create(User $user): bool
    {
        return true;
    }
}

