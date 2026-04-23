<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Admin\Support\AdminConfig;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class FetchAdminUsersAction
{
    public function execute(string $search): Collection
    {
        $query = User::query();

        if ($search !== '') {
            $query->where(function (Builder $inner) use ($search) {
                $inner->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(email) LIKE ?', ["%{$search}%"]);
            });
        }

        return $query
            ->orderByDesc('created_at')
            ->limit(AdminConfig::USERS_LIMIT)
            ->get();
    }
}
