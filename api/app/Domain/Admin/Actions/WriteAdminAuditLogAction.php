<?php

namespace App\Domain\Admin\Actions;

use App\Models\AdminAuditLog;
use App\Models\User;

class WriteAdminAuditLogAction
{
    public function execute(User $admin, string $action, ?string $details = null, array $context = []): void
    {
        AdminAuditLog::query()->create([
            'user_id' => $admin->id,
            'action' => $action,
            'details' => $details,
            'context' => $context,
        ]);
    }
}
