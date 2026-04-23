<?php

namespace App\Domain\Report\Actions;

use App\Models\Report;

class FindOpenDuplicateReportAction
{
    public function execute(int $reporterId, string $targetType, int $targetId): ?Report
    {
        return Report::query()
            ->where('reporter_id', $reporterId)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->where('status', Report::STATUS_OPEN)
            ->first();
    }
}

