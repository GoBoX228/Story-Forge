<?php

namespace App\Domain\Report\Actions;

use App\Models\AdminAuditLog;
use App\Models\Report;
use App\Models\User;

class WriteReportAuditLogAction
{
    public function execute(User $reporter, Report $report): void
    {
        AdminAuditLog::query()->create([
            'user_id' => $reporter->id,
            'action' => 'REPORT_CREATED',
            'details' => sprintf('Report #%d created', $report->id),
            'context' => [
                'target_type' => $report->target_type,
                'target_id' => $report->target_id,
            ],
        ]);
    }
}

