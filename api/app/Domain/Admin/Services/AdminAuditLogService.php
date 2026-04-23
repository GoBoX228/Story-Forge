<?php

namespace App\Domain\Admin\Services;

use App\Domain\Admin\Actions\FetchAdminLogsAction;
use App\Domain\Admin\Actions\WriteAdminAuditLogAction;
use App\Domain\Admin\Support\AdminConfig;
use App\Models\User;
use Illuminate\Support\Collection;

class AdminAuditLogService
{
    public function __construct(
        private readonly FetchAdminLogsAction $fetchAdminLogsAction,
        private readonly WriteAdminAuditLogAction $writeAdminAuditLogAction,
    ) {
    }

    public function listLatest(?int $limit = null): Collection
    {
        return $this->fetchAdminLogsAction->execute($limit ?? AdminConfig::LOGS_LIMIT);
    }

    public function write(User $admin, string $action, ?string $details = null, array $context = []): void
    {
        $this->writeAdminAuditLogAction->execute($admin, $action, $details, $context);
    }
}
