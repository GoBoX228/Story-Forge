<?php

namespace App\Domain\Admin\Actions;

use App\Models\Report;
use App\Models\User;

class PersistAdminReportChangesAction
{
    public function execute(Report $report, User $admin, bool $hasStatus, ?string $status): void
    {
        if ($hasStatus) {
            $report->status = (string) $status;

            if ($status === Report::STATUS_OPEN) {
                $report->reviewed_by = null;
                $report->reviewed_at = null;
            } else {
                $report->reviewed_by = $admin->id;
                $report->reviewed_at = now();
            }
        }

        $report->save();
    }
}
