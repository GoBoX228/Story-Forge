<?php

namespace App\Domain\Admin\Services;

use App\Domain\Admin\Actions\CountAdminStatsAction;
use App\Domain\Admin\Actions\FetchAdminBroadcastsAction;
use App\Domain\Admin\Support\AdminConfig;

class AdminOverviewService
{
    public function __construct(
        private readonly CountAdminStatsAction $countAdminStatsAction,
        private readonly FetchAdminBroadcastsAction $fetchAdminBroadcastsAction,
        private readonly AdminAuditLogService $adminAuditLogService,
    ) {
    }

    public function overview(): array
    {
        return [
            'stats' => $this->countAdminStatsAction->execute(),
            'logs' => $this->adminAuditLogService->listLatest(AdminConfig::OVERVIEW_LOGS_LIMIT),
            'broadcasts' => $this->fetchAdminBroadcastsAction->execute(AdminConfig::OVERVIEW_BROADCASTS_LIMIT),
        ];
    }
}
