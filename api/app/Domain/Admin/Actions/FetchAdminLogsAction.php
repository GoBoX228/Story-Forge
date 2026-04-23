<?php

namespace App\Domain\Admin\Actions;

use App\Models\AdminAuditLog;
use Illuminate\Support\Collection;

class FetchAdminLogsAction
{
    public function execute(int $limit): Collection
    {
        return AdminAuditLog::query()
            ->with('user:id,name,email')
            ->latest()
            ->limit($limit)
            ->get();
    }
}
